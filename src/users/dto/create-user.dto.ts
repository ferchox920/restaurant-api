import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'admin@restaurant.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8, example: 'change_me_123' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Ana' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Gomez' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ enum: Role, example: Role.ADMIN })
  @IsEnum(Role)
  role!: Role;
}
