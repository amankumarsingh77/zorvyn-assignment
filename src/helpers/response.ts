interface PaginationMeta {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
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

export function successResponse<T>(data: T, meta?: PaginationMeta): SuccessResponse<T> {
  return meta
    ? { success: true, data, meta }
    : { success: true, data };
}

export function errorResponse(code: string, message: string): ErrorResponse {
  return {
    success: false,
    error: { code, message },
  };
}
