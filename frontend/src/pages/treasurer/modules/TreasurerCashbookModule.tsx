/**
 * TreasurerCashbookModule — module "Sổ quỹ" cho CLUB_TREASURER: gom Nhập Thu · Nhập Chi ·
 * Sổ Quỹ vào tab con (UI Consolidation v2.1). Tái dùng màn đã có, KHÔNG đổi nghiệp vụ.
 * Truyền title ⇒ embedded (page con tự ẩn h1 trùng, giữ phụ đề + thao tác).
 */
import { ModuleTabs } from '../../../components/shared'
import { TreasurerIncome } from '../TreasurerIncome'
import { TreasurerExpense } from '../TreasurerExpense'
import { TreasurerLedger } from '../TreasurerLedger'

export function TreasurerCashbookModule() {
  return (
    <ModuleTabs
      title="Sổ quỹ"
      tabs={[
        { key: 'income', label: 'Nhập thu', element: <TreasurerIncome /> },
        { key: 'expense', label: 'Nhập chi', element: <TreasurerExpense /> },
        { key: 'ledger', label: 'Sổ quỹ', element: <TreasurerLedger /> },
      ]}
    />
  )
}
