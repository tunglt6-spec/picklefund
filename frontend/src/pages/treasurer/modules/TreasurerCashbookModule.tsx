/**
 * TreasurerCashbookModule — module "Sổ quỹ" cho CLUB_TREASURER: gom Nhập Thu · Nhập Chi ·
 * Sổ Quỹ vào tab con (UI Consolidation v2.1). Tái dùng màn đã có, KHÔNG đổi nghiệp vụ.
 * Truyền title ⇒ embedded (page con tự ẩn h1 trùng, giữ phụ đề + thao tác).
 */
import { ArrowDownCircle, ArrowUpCircle, BookOpen } from 'lucide-react'
import { ModuleTabs } from '../../../components/shared'
import { TreasurerIncome } from '../TreasurerIncome'
import { TreasurerExpense } from '../TreasurerExpense'
import { TreasurerLedger } from '../TreasurerLedger'

export function TreasurerCashbookModule() {
  return (
    <ModuleTabs
      title="Sổ quỹ"
      tabs={[
        { key: 'income', icon: ArrowDownCircle, label: 'Nhập thu', element: <TreasurerIncome /> },
        { key: 'expense', icon: ArrowUpCircle, label: 'Nhập chi', element: <TreasurerExpense /> },
        { key: 'ledger', icon: BookOpen, label: 'Sổ quỹ', element: <TreasurerLedger /> },
      ]}
    />
  )
}
