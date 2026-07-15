import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class AuthResponseDto {
  @ApiProperty({ example: 'JWT_TOKEN' })
  accessToken?: string;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}
