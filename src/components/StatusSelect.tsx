import type { Invoice, InvoiceStatus } from '../domain/types'
import { saveInvoice } from '../store/db'

const styles: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700',
  UNPAID: 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 dark:border-amber-800',
  PAID: 'bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-300 dark:border-green-800',
}

export default function StatusSelect({ invoice }: { invoice: Invoice }) {
  return (
    <select
      className={`rounded-full border px-2 py-0.5 text-xs font-semibold cursor-pointer outline-none ${styles[invoice.status]}`}
      value={invoice.status}
      onChange={(e) => {
        const status = e.target.value as InvoiceStatus
        saveInvoice({
          ...invoice,
          status,
          paidOn: status === 'PAID' ? new Date().toISOString().slice(0, 10) : undefined,
        })
      }}
    >
      <option value="DRAFT">Draft</option>
      <option value="UNPAID">Unpaid</option>
      <option value="PAID">Paid</option>
    </select>
  )
}
