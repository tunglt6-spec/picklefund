/** Chuỗi hiển thị theo thiết bị: mobile (<1024px) dùng tên tiếng Việt nghiệp vụ, màn lớn giữ tên cũ. Đánh giá khi render. */
export const mobileText = (desktop: string, mobile: string): string =>
  typeof window !== 'undefined' && window.innerWidth < 1024 ? mobile : desktop
