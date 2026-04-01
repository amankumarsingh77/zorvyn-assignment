type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
};

export function successResponse<T>(data: T, meta?: PaginationMeta) {
  const response: { success: true; data: T; meta?: PaginationMeta } = {
    success: true,
    data,
  };
  if (meta) {
    response.meta = meta;
  }
  return response;
}

export function errorResponse(code: string, message: string) {
  return {
    success: false,
    error: { code, message },
  };
}
