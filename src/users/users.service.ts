import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, AuditEntityType, Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../audit/audit.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../database/prisma.service';
import { runSerializableTransaction } from '../database/transaction';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { toUserResponse } from './user-response.mapper';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService = {
      log: async () => undefined,
    } as unknown as AuditService,
  ) {}

  async create(
    createUserDto: CreateUserDto,
    actorUserId?: string,
  ): Promise<UserResponseDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.runInTransaction(
      async (tx: Prisma.TransactionClient) => {
        const createdUser = await tx.user.create({
          data: {
            email: createUserDto.email,
            passwordHash,
            firstName: createUserDto.firstName,
            lastName: createUserDto.lastName,
            role: createUserDto.role,
          },
        });

        const response = toUserResponse(createdUser);
        await this.auditService.log(
          {
            userId: actorUserId,
            action: AuditAction.USER_CREATED,
            entityType: AuditEntityType.USER,
            entityId: createdUser.id,
            beforeData: null,
            afterData: response,
          },
          tx,
        );

        return createdUser;
      },
    );

    return toUserResponse(user);
  }

  async findAll(query: PaginationQueryDto = {}): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      ...(query.limit !== undefined ? { take: query.limit } : {}),
      ...(query.offset !== undefined ? { skip: query.offset } : {}),
    });

    return users.map(toUserResponse);
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with id "${id}" was not found.`);
    }

    return toUserResponse(user);
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    actorUserId?: string,
  ): Promise<UserResponseDto> {
    const existingUser = await this.getUserOrThrow(id);

    if (updateUserDto.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
        select: { id: true },
      });

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('A user with this email already exists.');
      }
    }

    try {
      const user = await this.runInTransaction(
        async (tx: Prisma.TransactionClient) => {
          const updatedUser = await tx.user.update({
            where: { id },
            data: updateUserDto,
          });

          await this.auditService.log(
            {
              userId: actorUserId,
              action: AuditAction.USER_UPDATED,
              entityType: AuditEntityType.USER,
              entityId: updatedUser.id,
              beforeData: existingUser ? toUserResponse(existingUser) : null,
              afterData: toUserResponse(updatedUser),
            },
            tx,
          );

          return updatedUser;
        },
      );

      return toUserResponse(user);
    } catch (error) {
      this.handlePrismaNotFound(error, id);
      throw error;
    }
  }

  async deactivate(id: string, actorUserId?: string): Promise<UserResponseDto> {
    return this.updateActiveStatus(
      id,
      false,
      actorUserId,
      AuditAction.USER_DEACTIVATED,
    );
  }

  async reactivate(id: string, actorUserId?: string): Promise<UserResponseDto> {
    return this.updateActiveStatus(
      id,
      true,
      actorUserId,
      AuditAction.USER_REACTIVATED,
    );
  }

  private async updateActiveStatus(
    id: string,
    active: boolean,
    actorUserId: string | undefined,
    action: AuditAction,
  ): Promise<UserResponseDto> {
    try {
      const user = await this.runInTransaction(
        async (tx: Prisma.TransactionClient) => {
          const existingUser = await tx.user.findUnique({ where: { id } });

          if (!existingUser) {
            throw new NotFoundException(`User with id "${id}" was not found.`);
          }

          if (!active) {
            await this.ensureAdminDeactivationAllowed(existingUser, tx);
          }

          const updatedUser = await tx.user.update({
            where: { id },
            data: { active },
          });

          await this.auditService.log(
            {
              userId: actorUserId,
              action,
              entityType: AuditEntityType.USER,
              entityId: updatedUser.id,
              beforeData: existingUser ? toUserResponse(existingUser) : null,
              afterData: toUserResponse(updatedUser),
            },
            tx,
          );

          return updatedUser;
        },
      );

      return toUserResponse(user);
    } catch (error) {
      this.handlePrismaNotFound(error, id);
      throw error;
    }
  }

  private async getUserOrThrow(id: string) {
    const user = await this.findUser(id);

    if (!user) {
      throw new NotFoundException(`User with id "${id}" was not found.`);
    }

    return user;
  }

  private findUser(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  private async ensureUserExists(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException(`User with id "${id}" was not found.`);
    }
  }

  private async ensureAdminDeactivationAllowed(
    user: { role: string; active: boolean },
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    if (user.role !== 'ADMIN' || !user.active) {
      return;
    }

    const activeAdminsCount = await tx.user.count({
      where: {
        role: 'ADMIN',
        active: true,
      },
    });

    if (activeAdminsCount <= 1) {
      throw new ConflictException(
        'The last active ADMIN user cannot be deactivated.',
      );
    }
  }

  private handlePrismaNotFound(error: unknown, id: string): never | void {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new NotFoundException(`User with id "${id}" was not found.`);
    }
  }

  private runInTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return runSerializableTransaction(this.prisma, callback);
  }
}
