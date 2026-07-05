import { useState } from 'react'
import type { Invoice, Party, Settings } from '../domain/types'
import { downloadInvoicePdf, exportInvoiceDocx, exportInvoiceXlsx, invoiceFileBase, shareInvoice } from '../export/files'
import { btnGhost } from './ui'

interface Props {
  getPrintNode: () => HTMLElement | null
  invoice: Invoice
  client: Party
  settings: Settings
  grandTotal: number
}

export default function ExportBar({ getPrintNode, invoice, client, settings, grandTotal }: Props) {
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState('')

  const run = async (key: string, fn: () => Promise<void> | void) => {
    setBusy(key)
    setNote('')
    try {
      await fn()
    } catch (e) {
      setNote('Export fail hua: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setBusy('')
    }
  }

  const need = () => {
    const n = getPrintNode()
    if (!n) throw new Error('preview ready nahi hai')
    return n
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className={btnGhost} onClick={() => window.print()}>Print</button>
      <button className={btnGhost} disabled={busy !== ''} onClick={() => run('pdf', () => downloadInvoicePdf(need(), invoiceFileBase(invoice, client) + '.pdf'))}>
        {busy === 'pdf' ? 'Banaya ja raha…' : 'PDF'}
      </button>
      <button
        className={btnGhost}
        disabled={busy !== ''}
        onClick={() =>
          run('share', async () => {
            const r = await shareInvoice(need(), invoice, client, grandTotal)
            if (r === 'fallback') setNote('PDF download ho gaya — WhatsApp me attach kar do (desktop pe direct attach possible nahi).')
          })
        }
      >
        {busy === 'share' ? 'Taiyar…' : 'Share / WhatsApp'}
      </button>
      <button className={btnGhost} onClick={() => exportInvoiceXlsx(invoice, client, settings)}>Excel</button>
      <button className={btnGhost} disabled={busy !== ''} onClick={() => run('docx', () => exportInvoiceDocx(invoice, client, settings))}>Word</button>
      {note && <span className="text-xs text-neutral-500">{note}</span>}
    </div>
  )
}
