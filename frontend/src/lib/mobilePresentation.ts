/** Keep chart categories recognisable without changing the source data or export labels. */
export function mobilePeriodLabel(name: string, index: number, startDate?: string): string {
  const quarter = name.match(/(?:quý|quarter|\bq)\s*([1-4])/iu)
  const year = name.match(/20\d{2}/u)?.[0] ?? startDate?.match(/^20\d{2}/u)?.[0]
  if (quarter) return `Q${quarter[1]}${year ? `/${year.slice(-2)}` : ''}`
  const month = name.match(/(?:tháng|month)\s*(\d{1,2})/iu)
  if (month) return `T${month[1]}${year ? `/${year.slice(-2)}` : ''}`
  return name.length <= 9 ? name : `Kỳ ${index + 1}`
}
