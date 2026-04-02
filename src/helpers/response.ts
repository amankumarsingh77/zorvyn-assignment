interface PaginationInput {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
}

interface PaginationMeta extends PaginationInput {
  readonly totalPages: number;
  readonly hasNextPage: boolean;
}

interface SuccessResponse<T> {
  readonly success: true;
  readonly data: T;
  readonly meta?: PaginationMeta;
}

interface ErrorResponse {
  readonly success: false;
  readonly error: { readonly code: string; readonly message: string };
}

export function successResponse<T>(data: T, meta?: PaginationInput): SuccessResponse<T> {
  if (!meta) return { success: true, data };

  const totalPages = Math.ceil(meta.total / meta.limit);
  return {
    success: true,
    data,
    meta: {
      ...meta,
      totalPages,
      hasNextPage: meta.page < totalPages,
    },
  };
}

export function errorResponse(code: string, message: string): ErrorResponse {
  return {
    success: false,
    error: { code, message },
  };
}
