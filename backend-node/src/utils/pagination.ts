import { PaginatedResult } from '../types/api.types';

export function buildPagination<T>(
  items: T[],
  page: number,
  limit: number,
  totalItems: number
): PaginatedResult<T> {
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  return {
    items,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}
