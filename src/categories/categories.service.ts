import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, AuditEntityType, Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { AuditService } from '../audit/audit.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../database/prisma.service';
import { toCategoryResponse } from './category-response.mapper';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService = {
      log: async () => undefined,
    } as unknown as AuditService,
  ) {}

  async create(
    createCategoryDto: CreateCategoryDto,
    createdById: string,
  ): Promise<CategoryResponseDto> {
    const existingCategory = await this.prisma.category.findUnique({
      where: { name: createCategoryDto.name },
      select: { id: true },
    });

    if (existingCategory) {
      throw new ConflictException('A category with this name already exists.');
    }

    const category = await this.runInTransaction(
      async (tx: Prisma.TransactionClient) => {
        const createdCategory = await tx.category.create({
          data: {
            name: createCategoryDto.name,
            description: createCategoryDto.description ?? null,
            createdById,
          },
        });

        await this.auditService.log(
          {
            userId: createdById,
            action: AuditAction.CATEGORY_CREATED,
            entityType: AuditEntityType.CATEGORY,
            entityId: createdCategory.id,
            beforeData: null,
            afterData: toCategoryResponse(createdCategory),
          },
          tx,
        );

        return createdCategory;
      },
    );

    return toCategoryResponse(category);
  }

  async findAll(
    active?: boolean,
    pagination: PaginationQueryDto = {},
  ): Promise<CategoryResponseDto[]> {
    const categories = await this.prisma.category.findMany({
      where: typeof active === 'boolean' ? { active } : undefined,
      orderBy: { name: 'asc' },
      ...(pagination.limit !== undefined ? { take: pagination.limit } : {}),
      ...(pagination.offset !== undefined ? { skip: pagination.offset } : {}),
    });

    return categories.map(toCategoryResponse);
  }

  async findOne(id: string): Promise<CategoryResponseDto> {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with id "${id}" was not found.`);
    }

    return toCategoryResponse(category);
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    actorUserId?: string,
  ): Promise<CategoryResponseDto> {
    const existingCategory = await this.getCategoryOrThrow(id);

    if (updateCategoryDto.name) {
      const existingCategory = await this.prisma.category.findUnique({
        where: { name: updateCategoryDto.name },
        select: { id: true },
      });

      if (existingCategory && existingCategory.id !== id) {
        throw new ConflictException(
          'A category with this name already exists.',
        );
      }
    }

    try {
      const category = await this.runInTransaction(
        async (tx: Prisma.TransactionClient) => {
          const updatedCategory = await tx.category.update({
            where: { id },
            data: {
              ...updateCategoryDto,
              description:
                updateCategoryDto.description === undefined
                  ? undefined
                  : updateCategoryDto.description,
            },
          });

          await this.auditService.log(
            {
              userId: actorUserId,
              action: AuditAction.CATEGORY_UPDATED,
              entityType: AuditEntityType.CATEGORY,
              entityId: updatedCategory.id,
              beforeData: existingCategory
                ? toCategoryResponse(existingCategory)
                : null,
              afterData: toCategoryResponse(updatedCategory),
            },
            tx,
          );

          return updatedCategory;
        },
      );

      return toCategoryResponse(category);
    } catch (error) {
      this.handlePrismaNotFound(error, id);
      throw error;
    }
  }

  async deactivate(
    id: string,
    actorUserId?: string,
  ): Promise<CategoryResponseDto> {
    return this.updateActiveStatus(
      id,
      false,
      actorUserId,
      AuditAction.CATEGORY_DEACTIVATED,
    );
  }

  async reactivate(
    id: string,
    actorUserId?: string,
  ): Promise<CategoryResponseDto> {
    return this.updateActiveStatus(
      id,
      true,
      actorUserId,
      AuditAction.CATEGORY_REACTIVATED,
    );
  }

  private async updateActiveStatus(
    id: string,
    active: boolean,
    actorUserId: string | undefined,
    action: AuditAction,
  ): Promise<CategoryResponseDto> {
    const existingCategory = await this.findCategory(id);

    try {
      const category = await this.runInTransaction(
        async (tx: Prisma.TransactionClient) => {
          const updatedCategory = await tx.category.update({
            where: { id },
            data: { active },
          });

          await this.auditService.log(
            {
              userId: actorUserId,
              action,
              entityType: AuditEntityType.CATEGORY,
              entityId: updatedCategory.id,
              beforeData: existingCategory
                ? toCategoryResponse(existingCategory)
                : null,
              afterData: toCategoryResponse(updatedCategory),
            },
            tx,
          );

          return updatedCategory;
        },
      );

      return toCategoryResponse(category);
    } catch (error) {
      this.handlePrismaNotFound(error, id);
      throw error;
    }
  }

  private async getCategoryOrThrow(id: string) {
    const category = await this.findCategory(id);

    if (!category) {
      throw new NotFoundException(`Category with id "${id}" was not found.`);
    }

    return category;
  }

  private findCategory(id: string) {
    return this.prisma.category.findUnique({
      where: { id },
    });
  }

  private handlePrismaNotFound(error: unknown, id: string): never | void {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new NotFoundException(`Category with id "${id}" was not found.`);
    }
  }

  private runInTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    if (!this.prisma.$transaction) {
      return callback(this.prisma as unknown as Prisma.TransactionClient);
    }

    const transactionResult = this.prisma.$transaction(callback);

    if (
      !transactionResult ||
      typeof (transactionResult as Promise<T>).then !== 'function'
    ) {
      return callback(this.prisma as unknown as Prisma.TransactionClient);
    }

    return transactionResult;
  }
}
