import { User } from '@prisma/client';
import { UserResponseDto } from './dto/user-response.dto';

export type UserRecord = Omit<User, 'passwordHash'>;

export function toUserResponse(user: UserRecord): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    active: user.active,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
