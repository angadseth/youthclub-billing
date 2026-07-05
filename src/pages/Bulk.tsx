import { useState } from 'react'
import { Link } from 'react-router-dom'
import { nextInvoiceNo } from '../domain/invoiceNo'
import { saveInvoice, useDB } from '../store/db'
import { Card, btnPrimary, inputCls, monthRange } from '../components/ui'

export default function Bulk() {
  const { clients, invoices, settings } = useDB()
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [values, setValues] = useState<Record<string, { attend: string; holidays: string }>>({})
  const [done, setDone] = useState<string[]>([])

  const existingFor = (cid: string) => invoices.find((i) => i.id === `${month}_${cid}`)

  const generate = () => {
    const { from, to } = monthRange(month)
    const nos = invoices.map((i) => i.no)
    const created: string[] = []
    for (const c of clients) {
      const v = values[c.id]
      if (!v || v.attend === '' || existingFor(c.id)) continue
      const no = nextInvoiceNo([...nos, ...created.map((_, k) => `${settings.invoicePrefix}/x/${k}`)], new Date(to + 'T00:00:00'), settings.invoicePrefix)
      nos.push(no)
      saveInvoice({
        id: `${month}_${c.id}`,
        no,
        date: to,
        clientId: c.id,
        periodFrom: from,
        periodTo: to,
        rows: c.defaultRows.map((r, i) => ({ ...r, sno: i + 1, from, to, attend: Number(v.attend) || 0, holidays: Number(v.holidays) || 0 })),
        taxMode: c.taxMode ?? settings.taxMode,
        taxRate: settings.taxRate,
        feesPct: settings.feesPct,
        status: 'UNPAID',
      })
      created.push(c.id)
    }
    setDone(created)
  }

  return (
    <div className="space-y-4">
      <Card title="Bulk billing — all clients at once">
        <div className="mb-4 flex items-end gap-3">
          <div>
            <span className="mb-1 block text-xs font-medium text-neutral-500">Month</span>
            <input type="month" className={inputCls} value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <button className={btnPrimary} onClick={generate}>Generate all bills</button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
              <th className="py-2 pr-3">Client</th>
              <th className="py-2 pr-3">Attendance</th>
              <th className="py-2 pr-3">Holidays</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => {
              const existing = existingFor(c.id)
              return (
                <tr key={c.id} className="border-b border-neutral-100 dark:border-neutral-800/60">
                  <td className="py-2 pr-3 font-medium">{c.name}</td>
                  <td className="py-2 pr-3">
                    <input type="number" disabled={!!existing} className={inputCls + ' max-w-24'} value={values[c.id]?.attend ?? ''} onChange={(e) => setValues({ ...values, [c.id]: { attend: e.target.value, holidays: values[c.id]?.holidays ?? '0' } })} />
                  </td>
                  <td className="py-2 pr-3">
                    <input type="number" disabled={!!existing} className={inputCls + ' max-w-24'} value={values[c.id]?.holidays ?? ''} onChange={(e) => setValues({ ...values, [c.id]: { attend: values[c.id]?.attend ?? '', holidays: e.target.value } })} />
                  </td>
                  <td className="py-2 text-xs">
                    {existing ? (
                      <Link className="text-brand-600 font-medium hover:underline" to={`/new?client=${c.id}&month=${month}`}>Created — open</Link>
                    ) : done.includes(c.id) ? (
                      <span className="text-green-600 font-medium">Created</span>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-neutral-500">Leave attendance blank to skip a client. Generated bills can be fine-tuned from the New Invoice page.</p>
      </Card>
    </div>
  )
}
