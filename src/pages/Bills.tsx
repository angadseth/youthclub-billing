import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import type { Invoice, Party, Settings } from '../domain/types'
import { computeTotals, fmtMoneyInt } from '../domain/calc'
import { useDB } from '../store/db'
import { invoicePdfBlob } from '../export/files'
import InvoiceA4 from '../components/InvoiceA4'
import StatusSelect from '../components/StatusSelect'
import { Card } from '../components/ui'

/** Renders the bill off-screen, converts to PDF and opens it in a new tab. */
export function BillPdfButton({ invoice, client, settings }: { invoice: Invoice; client: Party; settings: Settings }) {
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const winRef = useRef<Window | null>(null)

  useEffect(() => {
    if (!busy || !ref.current) return
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const blob = await invoicePdfBlob(ref.current!)
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        if (winRef.current && !winRef.current.closed) winRef.current.location.href = url
        else window.open(url, '_blank')
      } catch (e) {
        winRef.current?.close()
        alert('PDF failed: ' + (e instanceof Error ? e.message : String(e)))
      } finally {
        if (!cancelled) setBusy(false)
      }
    }, 250) // let the off-screen render (logo image) settle first
    return () => { cancelled = true; clearTimeout(t) }
  }, [busy])

  return (
    <>
      <button
        className="text-xs font-medium text-brand-600 hover:underline cursor-pointer disabled:opacity-50"
        disabled={busy}
        onClick={() => {
          // open the tab inside the click gesture so popup blockers allow it,
          // then point it at the PDF once generated
          winRef.current = window.open('about:blank', '_blank')
          setBusy(true)
        }}
      >
        {busy ? 'Opening…' : 'PDF'}
      </button>
      {busy && createPortal(
        <div ref={ref} style={{ position: 'absolute', left: '-9999px', top: 0, width: '210mm' }} aria-hidden>
          <InvoiceA4 invoice={invoice} client={client} settings={settings} />
        </div>,
        document.body,
      )}
    </>
  )
}

/** Folder-style view: one folder per client, all their bills inside. */
export default function Bills() {
  const { clients, invoices, settings } = useDB()
  const [open, setOpen] = useState<Record<string, boolean>>({})

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-500">
        Every client has a folder with all their bills. Set each bill&apos;s status here — Paid bills feed the dashboard graphs.
      </p>

      {clients.map((c) => {
        const bills = invoices
          .filter((i) => i.clientId === c.id)
          .map((inv) => ({ inv, t: computeTotals(inv, settings.columns) }))
          .sort((a, b) => b.inv.periodTo.localeCompare(a.inv.periodTo))
        const due = bills.filter((b) => b.inv.status === 'UNPAID').reduce((a, b) => a + b.t.grandTotal, 0)
        const drafts = bills.filter((b) => b.inv.status === 'DRAFT').length
        const isOpen = open[c.id] ?? false

        return (
          <Card key={c.id} className="overflow-hidden">
            <button
              className="flex w-full items-center gap-3 text-left cursor-pointer"
              onClick={() => setOpen({ ...open, [c.id]: !isOpen })}
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-brand-500" fill="currentColor">
                <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z" />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{c.name}</div>
                <div className="text-xs text-neutral-500">
                  {bills.length} bill{bills.length === 1 ? '' : 's'}
                  {drafts > 0 && ` · ${drafts} draft`}
                  {due > 0 && <span className="text-amber-600 dark:text-amber-400"> · ₹ {fmtMoneyInt(due)} due</span>}
                </div>
              </div>
              <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>

            {isOpen && (
              <div className="mt-3 border-t border-neutral-200 dark:border-neutral-800 pt-2">
                {bills.length === 0 ? (
                  <p className="py-2 text-sm text-neutral-500">
                    No bills yet. <Link className="text-brand-600 font-medium hover:underline" to={`/new?client=${c.id}`}>Create the first one →</Link>
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-neutral-500">
                          <th className="py-1.5 pr-3 font-medium">Invoice No</th>
                          <th className="py-1.5 pr-3 font-medium">Month</th>
                          <th className="py-1.5 pr-3 font-medium text-right">Amount</th>
                          <th className="py-1.5 pr-3 font-medium">Status</th>
                          <th className="py-1.5" />
                        </tr>
                      </thead>
                      <tbody>
                        {bills.map(({ inv, t }) => (
                          <tr key={inv.id} className="border-t border-neutral-100 dark:border-neutral-800/60">
                            <td className="py-2 pr-3 font-medium">{inv.no}</td>
                            <td className="py-2 pr-3 text-neutral-500">
                              {new Date(inv.periodTo + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                            </td>
                            <td className="py-2 pr-3 text-right tabular-nums font-semibold">₹ {fmtMoneyInt(t.grandTotal)}</td>
                            <td className="py-2 pr-3"><StatusSelect invoice={inv} /></td>
                            <td className="py-2 text-right whitespace-nowrap space-x-3">
                              <BillPdfButton invoice={inv} client={c} settings={settings} />
                              <Link className="text-xs font-medium text-brand-600 hover:underline" to={`/new?client=${inv.clientId}&month=${inv.periodTo.slice(0, 7)}`}>
                                Open
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
