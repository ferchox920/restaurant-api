import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { toUserResponse } from './user-response.mapper';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        passwordHash,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        role: createUserDto.role,
      },
    });

    return toUserResponse(user);
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
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

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    await this.ensureUserExists(id);

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
      const user = await this.prisma.user.update({
        where: { id },
        data: updateUserDto,
      });

      return toUserResponse(user);
    } catch (error) {
      this.handlePrismaNotFound(error, id);
      throw error;
    }
  }

  async deactivate(id: string): Promise<UserResponseDto> {
    await this.ensureAdminDeactivationAllowed(id);
    return this.updateActiveStatus(id, false);
  }

  async reactivate(id: string): Promise<UserResponseDto> {
    return this.updateActiveStatus(id, true);
  }

  private async updateActiveStatus(
    id: string,
    active: boolean,
  ): Promise<UserResponseDto> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: { active },
      });

      return toUserResponse(user);
    } catch (error) {
      this.handlePrismaNotFound(error, id);
      throw error;
    }
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

  private async ensureAdminDeactivationAllowed(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        active: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with id "${id}" was not found.`);
    }

    if (user.role !== Role.ADMIN || !user.active) {
      return;
    }

    const activeAdminsCount = await this.prisma.user.count({
      where: {
        role: Role.ADMIN,
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
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new NotFoundException(`User with id "${id}" was not found.`);
    }
  }
}
