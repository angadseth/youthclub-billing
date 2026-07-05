import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Invoice, Party, TaxMode } from '../domain/types'
import { computeTotals, fmtMoneyInt } from '../domain/calc'
import { nextInvoiceNo } from '../domain/invoiceNo'
import { saveInvoice, useDB } from '../store/db'
import InvoiceA4, { invoicePageCount } from '../components/InvoiceA4'
import ExportBar from '../components/ExportBar'
import { Card, Field, btnGhost, btnPrimary, inputCls, monthRange } from '../components/ui'

const A4_PX = 793.7 // 210mm at 96dpi

function buildDraft(client: Party, month: string, existingNos: string[], prefix: string, base?: Invoice): Invoice {
  const { from, to } = monthRange(month)
  const rows = (base ? base.rows : client.defaultRows).map((r, i) => ({ ...r, sno: i + 1, from, to }))
  return {
    id: `${month}_${client.id}`,
    no: nextInvoiceNo(existingNos, new Date(to + 'T00:00:00'), prefix),
    date: to,
    clientId: client.id,
    periodFrom: from,
    periodTo: to,
    rows,
    taxMode: base?.taxMode ?? client.taxMode ?? 'CGST_SGST',
    taxRate: base?.taxRate ?? 18,
    feesPct: base?.feesPct ?? 10,
    status: 'UNPAID',
    notes: base?.notes,
  }
}

export default function NewInvoice() {
  const { settings, clients, invoices } = useDB()
  const [params] = useSearchParams()
  const [clientId, setClientId] = useState(params.get('client') ?? '')
  const [month, setMonth] = useState(params.get('month') ?? new Date().toISOString().slice(0, 7))
  const [draft, setDraft] = useState<Invoice | null>(null)
  const [savedAt, setSavedAt] = useState(0)
  const [tab, setTab] = useState<'form' | 'preview'>('form')

  const client = clients.find((c) => c.id === clientId)
  const existingNos = useMemo(() => invoices.map((i) => i.no), [invoices])

  useEffect(() => {
    if (!client || !month) return setDraft(null)
    const existing = invoices.find((i) => i.id === `${month}_${client.id}`)
    if (existing) setDraft(existing)
    else setDraft(buildDraft(client, month, existingNos, settings.invoicePrefix))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, month])

  const copyLastMonth = () => {
    if (!client) return
    const prev = invoices
      .filter((i) => i.clientId === client.id && i.periodTo < `${month}-01`)
      .sort((a, b) => b.periodTo.localeCompare(a.periodTo))[0]
    if (prev) setDraft(buildDraft(client, month, existingNos, settings.invoicePrefix, prev))
  }

  const totals = draft ? computeTotals(draft, settings.columns) : null

  // live preview scaling
  const shellRef = useRef<HTMLDivElement>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.5)
  useEffect(() => {
    const el = shellRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / A4_PX)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [draft])

  const editableCols = settings.columns.filter((c) => !c.formula && c.key !== 'sno')

  const setRow = (ri: number, key: string, value: string) => {
    if (!draft) return
    const col = settings.columns.find((c) => c.key === key)
    const rows = draft.rows.map((r, i) =>
      i === ri ? { ...r, [key]: col?.type === 'number' ? (value === '' ? '' : Number(value)) : value } : r,
    )
    setDraft({ ...draft, rows })
  }

  const addRow = () => {
    if (!draft || !client) return
    const template = client.defaultRows[0] ?? {}
    const blank = Object.fromEntries(Object.keys(template).map((k) => [k, typeof template[k] === 'number' ? 0 : '']))
    setDraft({ ...draft, rows: [...draft.rows, { ...blank, sno: draft.rows.length + 1, from: draft.periodFrom, to: draft.periodTo }] })
  }
  const removeRow = (ri: number) => {
    if (!draft) return
    setDraft({ ...draft, rows: draft.rows.filter((_, i) => i !== ri).map((r, i) => ({ ...r, sno: i + 1 })) })
  }

  const save = () => {
    if (!draft) return
    saveInvoice(draft)
    setSavedAt(Date.now())
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Client / Party">
          <select className={inputCls + ' min-w-56'} value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">— Select client —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Billing month">
          <input type="month" className={inputCls} value={month} onChange={(e) => setMonth(e.target.value)} />
        </Field>
        {draft && client && (
          <>
            <button className={btnGhost} onClick={copyLastMonth}>Copy last month</button>
            <button className={btnPrimary} onClick={save}>Save</button>
            {savedAt > 0 && <span className="text-xs text-green-600 dark:text-green-400 font-medium">Saved ✓</span>}
          </>
        )}
      </div>

      {!draft || !client ? (
        <Card>
          <p className="text-sm text-neutral-500">Select a client and month — the invoice builds here with a live preview on the right.</p>
        </Card>
      ) : (
        <>
          <div className="flex gap-2 lg:hidden">
            <button className={tab === 'form' ? btnPrimary : btnGhost} onClick={() => setTab('form')}>Form</button>
            <button className={tab === 'preview' ? btnPrimary : btnGhost} onClick={() => setTab('preview')}>Preview</button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            {/* FORM */}
            <div className={`space-y-4 ${tab === 'preview' ? 'hidden lg:block' : ''}`}>
              <Card title={`Invoice — ${client.name}`}>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Invoice No">
                    <input className={inputCls} value={draft.no} onChange={(e) => setDraft({ ...draft, no: e.target.value })} />
                  </Field>
                  <Field label="Date">
                    <input type="date" className={inputCls} value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
                  </Field>
                  <Field label="Tax">
                    <select className={inputCls} value={draft.taxMode} onChange={(e) => setDraft({ ...draft, taxMode: e.target.value as TaxMode })}>
                      <option value="CGST_SGST">CGST + SGST</option>
                      <option value="IGST">IGST</option>
                      <option value="NONE">No tax (Bill of Supply)</option>
                    </select>
                  </Field>
                  <Field label={`${settings.feesLabel} %`}>
                    <input type="number" className={inputCls} value={draft.feesPct} onChange={(e) => setDraft({ ...draft, feesPct: Number(e.target.value) || 0 })} />
                  </Field>
                  {draft.taxMode !== 'NONE' && (
                    <Field label="GST % (total — 0 hides tax lines)">
                      <input type="number" className={inputCls} value={draft.taxRate} onChange={(e) => setDraft({ ...draft, taxRate: Number(e.target.value) || 0 })} />
                    </Field>
                  )}
                </div>
              </Card>

              <Card title="Service rows" action={<button className={btnGhost} onClick={addRow}>+ Row</button>}>
                <div className="space-y-4">
                  {draft.rows.map((row, ri) => (
                    <div key={ri} className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-neutral-500">Row {ri + 1}</span>
                        {draft.rows.length > 1 && (
                          <button className="text-xs text-red-500 hover:underline cursor-pointer" onClick={() => removeRow(ri)}>Remove</button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {editableCols.map((c) => (
                          <Field key={c.key} label={c.label}>
                            <input
                              type={c.type === 'number' ? 'number' : c.type === 'date' ? 'date' : 'text'}
                              className={inputCls}
                              value={String(row[c.key] ?? '')}
                              onChange={(e) => setRow(ri, c.key, e.target.value)}
                            />
                          </Field>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Notes (optional)">
                <input className={inputCls} value={draft.notes ?? ''} placeholder="Extra note printed on the invoice" onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
              </Card>

              {totals && (
                <Card title="Totals">
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between"><span>Basic</span><span className="tabular-nums">₹ {totals.basicTotal.toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between"><span>Sub Total</span><span className="tabular-nums">₹ {totals.subTotal.toLocaleString('en-IN')}</span></div>
                    {totals.taxLines.map((t) => (
                      <div key={t.label} className="flex justify-between text-neutral-500"><span>{t.label}</span><span className="tabular-nums">₹ {t.amount.toLocaleString('en-IN')}</span></div>
                    ))}
                    <div className="flex justify-between font-bold text-base pt-1 border-t border-neutral-200 dark:border-neutral-800">
                      <span>Grand Total</span><span className="tabular-nums">₹ {fmtMoneyInt(totals.grandTotal)}</span>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* PREVIEW */}
            <div className={`space-y-3 ${tab === 'form' ? 'hidden lg:block' : ''}`}>
              <ExportBar getPrintNode={() => printRef.current} invoice={draft} client={client} settings={settings} grandTotal={totals?.grandTotal ?? 0} />
              <div ref={shellRef} className="overflow-hidden">
                <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: A4_PX, height: scale * 1130 * invoicePageCount(draft.rows.length) }}>
                  <InvoiceA4 invoice={draft} client={client} settings={settings} />
                </div>
              </div>
            </div>
          </div>

          {/* full-scale hidden copy for print + PDF capture */}
          <div id="print-root" ref={printRef} style={{ position: 'absolute', left: '-9999px', top: 0, width: '210mm' }} aria-hidden>
            <InvoiceA4 invoice={draft} client={client} settings={settings} />
          </div>
        </>
      )}
    </div>
  )
}
