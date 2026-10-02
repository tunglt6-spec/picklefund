/**
 * Quyền xuất file (Excel/PDF) — logic thuần, không phụ thuộc React.
 * MEMBER_VIEW được XEM read-only dữ liệu toàn CLB trên màn hình, nhưng KHÔNG được tải file
 * chứa danh bạ (SĐT/email) / công nợ / điểm của người khác (dễ phát tán PII). Chỉ được xuất
 * dữ liệu CỦA CHÍNH MÌNH (màn member/*).
 */
export function canExportOrgWideData(role?: string | null): boolean {
  return role !== 'MEMBER_VIEW'
}
