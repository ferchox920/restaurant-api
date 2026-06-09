import { Prisma } from '@prisma/client';
import { CategoryResponseDto } from './dto/category-response.dto';

export type CategoryRecord = Prisma.CategoryGetPayload<Record<string, never>>;

export function toCategoryResponse(
  category: CategoryRecord,
): CategoryResponseDto {
  return {
    id: category.id,
    name: category.name,
    description: category.description,
    active: category.active,
    createdById: category.createdById,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}
