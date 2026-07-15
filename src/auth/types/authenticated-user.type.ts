import { UserResponseDto } from '../../users/dto/user-response.dto';

export type AuthenticatedUser = UserResponseDto & { sessionJti?: string };
