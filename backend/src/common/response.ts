export function ok<T>(data: T, message = 'Success') {
  return { success: true, data, message };
}

export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
) {
  return {
    success: true,
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
