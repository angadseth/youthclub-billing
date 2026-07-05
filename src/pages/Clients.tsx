import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Party } from '../domain/types'
import { computeTotals, fmtMoneyInt } from '../domain/calc'
import { saveClient, useDB } from '../store/db'
import { Card, Field, btnGhost, btnPrimary, inputCls } from '../components/ui'

const blank = (): Party => ({
  id: 'client-' + Date.now().toString(36),
  name: '',
  address: [],
  dueDays: 30,
  defaultRows: [
    { sno: 1, description: '', sasCode: '', from: '', to: '', units: 1, basicSalary: 0, days: 0, ratePerDay: 0, attend: 0, holidays: 0, totalDays: 0 },
  ],
})

export default function Clients() {
  const { clients, invoices, settings } = useDB()
  const [editing, setEditing] = useState<Party | null>(null)
  const [ledgerFor, setLedgerFor] = useState('')

  const ledger = (id: string) => {
    const list = invoices.filter((i) => i.clientId === id)
    const totals = list.map((i) => ({ inv: i, t: computeTotals(i, settings.columns) }))
    const billed = totals.reduce((a, x) => a + x.t.grandTotal, 0)
    const paid = totals.filter((x) => x.inv.status === 'PAID').reduce((a, x) => a + x.t.grandTotal, 0)
    return { list: totals, billed, paid, outstanding: billed - paid }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className={btnPrimary} onClick={() => setEditing(blank())}>+ Naya Client</button>
      </div>

      {editing && (
        <Card title={editing.name ? `Edit — ${editing.name}` : 'Naya Client'}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Naam"><input className={inputCls} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="GST (optional)"><input className={inputCls} value={editing.gst ?? ''} onChange={(e) => setEditing({ ...editing, gst: e.target.value })} /></Field>
            <Field label="CL Code"><input className={inputCls} value={editing.clCode ?? ''} onChange={(e) => setEditing({ ...editing, clCode: e.target.value })} /></Field>
            <Field label="Payment due days"><input type="number" className={inputCls} value={editing.dueDays} onChange={(e) => setEditing({ ...editing, dueDays: Number(e.target.value) || 30 })} /></Field>
            <Field label="State"><input className={inputCls} value={editing.stateName ?? ''} onChange={(e) => setEditing({ ...editing, stateName: e.target.value })} /></Field>
            <Field label="State Code"><input className={inputCls} value={editing.stateCode ?? ''} onChange={(e) => setEditing({ ...editing, stateCode: e.target.value })} /></Field>
            <div className="sm:col-span-2">
              <Field label="Address (har line alag)">
                <textarea className={inputCls} rows={3} value={editing.address.join('\n')} onChange={(e) => setEditing({ ...editing, address: e.target.value.split('\n') })} />
              </Field>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold text-neutral-500">Default service rows (naya bill inhi se shuru hota hai)</div>
            {editing.defaultRows.map((row, ri) => (
              <div key={ri} className="mb-2 grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 p-2">
                {settings.columns.filter((c) => !c.formula && !['sno', 'from', 'to', 'attend', 'holidays', 'totalDays'].includes(c.key)).map((c) => (
                  <Field key={c.key} label={c.label}>
                    <input
                      type={c.type === 'number' ? 'number' : 'text'}
                      className={inputCls}
                      value={String(row[c.key] ?? '')}
                      onChange={(e) => {
                        const rows = editing.defaultRows.map((r, i) => (i === ri ? { ...r, [c.key]: c.type === 'number' ? Number(e.target.value) || 0 : e.target.value } : r))
                        setEditing({ ...editing, defaultRows: rows })
                      }}
                    />
                  </Field>
                ))}
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <button className={btnPrimary} disabled={!editing.name.trim()} onClick={() => { saveClient(editing); setEditing(null) }}>Save</button>
            <button className={btnGhost} onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {clients.map((c) => {
          const l = ledger(c.id)
          return (
            <Card key={c.id} title={c.name} action={
              <div className="flex gap-2">
                <button className="text-xs font-medium text-brand-600 hover:underline cursor-pointer" onClick={() => setEditing(c)}>Edit</button>
                <button className="text-xs font-medium text-brand-600 hover:underline cursor-pointer" onClick={() => setLedgerFor(ledgerFor === c.id ? '' : c.id)}>Ledger</button>
              </div>
            }>
              <div className="text-xs text-neutral-500 space-y-0.5">
                {c.gst && <div>GST: {c.gst}</div>}
                {c.address.slice(0, 2).map((a, i) => <div key={i}>{a}</div>)}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div><div className="text-xs text-neutral-500">Billed</div><div className="font-bold tabular-nums">₹{fmtMoneyInt(l.billed)}</div></div>
                <div><div className="text-xs text-neutral-500">Paid</div><div className="font-bold tabular-nums text-green-600">₹{fmtMoneyInt(l.paid)}</div></div>
                <div><div className="text-xs text-neutral-500">Baaki</div><div className={`font-bold tabular-nums ${l.outstanding > 0 ? 'text-red-500' : ''}`}>₹{fmtMoneyInt(l.outstanding)}</div></div>
              </div>
              {ledgerFor === c.id && (
                <div className="mt-3 border-t border-neutral-200 dark:border-neutral-800 pt-2 text-xs space-y-1">
                  {l.list.length === 0 && <div className="text-neutral-500">Koi bill nahi abhi.</div>}
                  {l.list.map(({ inv, t }) => (
                    <div key={inv.id} className="flex justify-between">
                      <span>{inv.no} · {inv.date}</span>
                      <span className={`tabular-nums font-medium ${inv.status === 'PAID' ? 'text-green-600' : 'text-amber-600'}`}>₹{fmtMoneyInt(t.grandTotal)} · {inv.status === 'PAID' ? 'Paid' : 'Baaki'}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3">
                <Link className="text-xs font-semibold text-brand-600 hover:underline" to={`/new?client=${c.id}`}>Naya bill banao →</Link>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
