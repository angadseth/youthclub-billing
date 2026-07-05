import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { computeTotals, fmtMoneyInt } from '../domain/calc'
import { useDB } from '../store/db'
import StatusSelect from '../components/StatusSelect'
import { exportRegisterXlsx } from '../export/files'
import { Card, btnGhost, inputCls } from '../components/ui'

export default function Register() {
  const { settings, clients, invoices } = useDB()
  const [monthF, setMonthF] = useState('')
  const [clientF, setClientF] = useState('')

  const byId = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients])
  const list = invoices
    .filter((i) => (!monthF || i.date.startsWith(monthF)) && (!clientF || i.clientId === clientF))
    .sort((a, b) => b.date.localeCompare(a.date) || b.no.localeCompare(a.no))

  const today = new Date()
  const overdueDays = (dateIso: string, due: number) => {
    const d = Math.floor((today.getTime() - new Date(dateIso).getTime()) / 86400000) - due
    return d > 0 ? d : 0
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <span className="mb-1 block text-xs font-medium text-neutral-500">Month</span>
          <input type="month" className={inputCls} value={monthF} onChange={(e) => setMonthF(e.target.value)} />
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium text-neutral-500">Client</span>
          <select className={inputCls + ' min-w-48'} value={clientF} onChange={(e) => setClientF(e.target.value)}>
            <option value="">All clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <button className={btnGhost} onClick={() => exportRegisterXlsx(list, clients, settings)}>
          Excel export (Register + GST summary)
        </button>
      </div>

      <Card title={`Bills — ${list.length}`}>
        {list.length === 0 ? (
          <p className="text-sm text-neutral-500">No bills yet. Create your first invoice from "New Invoice".</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                  <th className="py-2 pr-3">Invoice No</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Client</th>
                  <th className="py-2 pr-3 text-right">Amount</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {list.map((inv) => {
                  const t = computeTotals(inv, settings.columns)
                  const client = byId.get(inv.clientId)
                  const od = inv.status === 'UNPAID' ? overdueDays(inv.date, client?.dueDays ?? 30) : 0
                  return (
                    <tr key={inv.id} className="border-b border-neutral-100 dark:border-neutral-800/60">
                      <td className="py-2 pr-3 font-medium">{inv.no}</td>
                      <td className="py-2 pr-3 text-neutral-500">{inv.date}</td>
                      <td className="py-2 pr-3">{client?.name ?? inv.clientId}</td>
                      <td className="py-2 pr-3 text-right tabular-nums font-semibold">₹ {fmtMoneyInt(t.grandTotal)}</td>
                      <td className="py-2 pr-3">
                        <StatusSelect invoice={inv} />
                        {od > 0 && <span className="ml-2 text-xs font-medium text-red-500">overdue {od}d</span>}
                      </td>
                      <td className="py-2 text-right">
                        <Link className="text-xs font-medium text-brand-600 hover:underline" to={`/new?client=${inv.clientId}&month=${inv.periodTo.slice(0, 7)}`}>
                          Open
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
