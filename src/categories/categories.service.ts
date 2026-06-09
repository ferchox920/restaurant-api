import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../database/prisma.service';
import { toCategoryResponse } from './category-response.mapper';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createCategoryDto: CreateCategoryDto,
    createdById: string,
  ): Promise<CategoryResponseDto> {
    const existingCategory = await this.prisma.category.findUnique({
      where: { name: createCategoryDto.name },
      select: { id: true },
    });

    if (existingCategory) {
      throw new ConflictException(
        'A category with this name already exists.',
      );
    }

    const category = await this.prisma.category.create({
      data: {
        name: createCategoryDto.name,
        description: createCategoryDto.description ?? null,
        createdById,
      },
    });

    return toCategoryResponse(category);
  }

  async findAll(active?: boolean): Promise<CategoryResponseDto[]> {
    const categories = await this.prisma.category.findMany({
      where: typeof active === 'boolean' ? { active } : undefined,
      orderBy: { name: 'asc' },
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
  ): Promise<CategoryResponseDto> {
    await this.ensureCategoryExists(id);

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
      const category = await this.prisma.category.update({
        where: { id },
        data: {
          ...updateCategoryDto,
          description:
            updateCategoryDto.description === undefined
              ? undefined
              : updateCategoryDto.description,
        },
      });

      return toCategoryResponse(category);
    } catch (error) {
      this.handlePrismaNotFound(error, id);
      throw error;
    }
  }

  async deactivate(id: string): Promise<CategoryResponseDto> {
    return this.updateActiveStatus(id, false);
  }

  async reactivate(id: string): Promise<CategoryResponseDto> {
    return this.updateActiveStatus(id, true);
  }

  private async updateActiveStatus(
    id: string,
    active: boolean,
  ): Promise<CategoryResponseDto> {
    try {
      const category = await this.prisma.category.update({
        where: { id },
        data: { active },
      });

      return toCategoryResponse(category);
    } catch (error) {
      this.handlePrismaNotFound(error, id);
      throw error;
    }
  }

  private async ensureCategoryExists(id: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!category) {
      throw new NotFoundException(`Category with id "${id}" was not found.`);
    }
  }

  private handlePrismaNotFound(error: unknown, id: string): never | void {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new NotFoundException(`Category with id "${id}" was not found.`);
    }
  }
}
