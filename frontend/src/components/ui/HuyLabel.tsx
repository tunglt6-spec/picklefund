/** Nút hủy thống nhất: mobile (<1024px) luôn "Hủy"; màn lớn giữ "Hủy bỏ" như cũ. */
export function HuyLabel() {
  return <><span className="lg:hidden">Hủy</span><span className="max-lg:hidden">Hủy bỏ</span></>
}
