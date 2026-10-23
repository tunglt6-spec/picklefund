/** Bỏ dấu tiếng Việt + hạ chữ để tìm "diem danh" ra "Điểm danh". */
export const fold = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
