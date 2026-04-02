type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
};

interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

interface ErrorResponse {
  success: false;
  error: { code: string; message: string };
}

export function successResponse<T>(data: T, meta?: PaginationMeta): SuccessResponse<T> {
  const response: SuccessResponse<T> = {
    success: true,
    data,
  };
  if (meta) {
    response.meta = meta;
  }
  return response;
}

export function errorResponse(code: string, message: string): ErrorResponse {
  return {
    success: false,
    error: { code, message },
  };
}
