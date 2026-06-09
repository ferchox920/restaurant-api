import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'admin@restaurant.local' })
  email!: string;

  @ApiProperty({ example: 'Ana' })
  firstName!: string;

  @ApiProperty({ example: 'Gomez' })
  lastName!: string;

  @ApiProperty({ enum: Role, example: Role.ADMIN })
  role!: Role;

  @ApiProperty({ example: true })
  active!: boolean;

  @ApiProperty({
    example: '2026-06-08T23:15:00.000Z',
    nullable: true,
    required: false,
  })
  lastLoginAt!: Date | null;

  @ApiProperty({ example: '2026-06-08T23:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-08T23:10:00.000Z' })
  updatedAt!: Date;
}
