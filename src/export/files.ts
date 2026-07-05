import type { Invoice, Party, Settings } from '../domain/types'
import { computeRow, computeTotals } from '../domain/calc'
import { amountInWordsINR } from '../domain/words'

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export const safeFileName = (s: string) => s.replace(/[^A-Za-z0-9._-]+/g, '-')

export function invoiceFileBase(inv: Invoice, client: Party) {
  return safeFileName(`${inv.no}-${client.name}`)
}

const pdfOpts = {
  margin: 0,
  image: { type: 'jpeg' as const, quality: 0.97 },
  html2canvas: { scale: 2.2, useCORS: true },
  jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  pagebreak: { mode: ['css'] },
} as const

export async function invoicePdfBlob(node: HTMLElement): Promise<Blob> {
  const html2pdf = (await import('html2pdf.js')).default
  return html2pdf().set(pdfOpts).from(node).outputPdf('blob')
}

export async function downloadInvoicePdf(node: HTMLElement, filename: string) {
  const html2pdf = (await import('html2pdf.js')).default
  await html2pdf().set({ ...pdfOpts, filename }).from(node).save()
}

/** Web Share API with PDF file; falls back to download + WhatsApp Web text. */
export async function shareInvoice(node: HTMLElement, inv: Invoice, client: Party, grand: number): Promise<'shared' | 'fallback'> {
  const blob = await invoicePdfBlob(node)
  const filename = invoiceFileBase(inv, client) + '.pdf'
  const file = new File([blob], filename, { type: 'application/pdf' })
  const text = `Invoice ${inv.no} — ${client.name} — Rs. ${grand.toLocaleString('en-IN')}`
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename, text })
      return 'shared'
    } catch {
      /* user cancelled or unsupported → fallback */
    }
  }
  download(blob, filename)
  window.open(`https://wa.me/?text=${encodeURIComponent(text + ' (PDF downloaded — attach it here)')}`, '_blank')
  return 'fallback'
}

export async function exportInvoiceXlsx(inv: Invoice, client: Party, settings: Settings) {
  const XLSX = await import('xlsx')
  const { columns } = settings
  const totals = computeTotals(inv, columns)
  const rows = inv.rows.map((r) => {
    const c = computeRow(r, columns)
    return Object.fromEntries(columns.map((col) => [col.label, c[col.key] ?? '']))
  })
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.sheet_add_aoa(ws, [
    [],
    [`${inv.feesPct}% ${settings.feesLabel}`, totals.fees],
    ['Sub Total', totals.subTotal],
    ...totals.taxLines.map((t) => [t.label, t.amount]),
    ['Round Off', totals.roundOff],
    ['Grand Total', totals.grandTotal],
    ['Amount in Words', amountInWordsINR(totals.grandTotal)],
  ], { origin: -1 })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Invoice')
  XLSX.writeFile(wb, invoiceFileBase(inv, client) + '.xlsx')
}

export async function exportRegisterXlsx(invoices: Invoice[], clients: Party[], settings: Settings) {
  const XLSX = await import('xlsx')
  const byId = new Map(clients.map((c) => [c.id, c]))
  const rows = invoices.map((inv) => {
    const t = computeTotals(inv, settings.columns)
    return {
      'Invoice No': inv.no,
      Date: inv.date,
      Client: byId.get(inv.clientId)?.name ?? inv.clientId,
      'Period From': inv.periodFrom,
      'Period To': inv.periodTo,
      Basic: t.basicTotal,
      Fees: t.fees,
      'Taxable Value': t.subTotal,
      ...(Object.fromEntries(t.taxLines.map((l) => [l.label.split(' @')[0], l.amount]))),
      'Grand Total': t.grandTotal,
      Status: inv.status,
      'Paid On': inv.paidOn ?? '',
    }
  })
  // GST summary by month
  const byMonth = new Map<string, { taxable: number; sgst: number; cgst: number; igst: number; total: number }>()
  for (const inv of invoices) {
    const t = computeTotals(inv, settings.columns)
    const m = inv.date.slice(0, 7)
    const e = byMonth.get(m) ?? { taxable: 0, sgst: 0, cgst: 0, igst: 0, total: 0 }
    e.taxable += t.subTotal
    for (const l of t.taxLines) {
      if (l.label.startsWith('SGST')) e.sgst += l.amount
      else if (l.label.startsWith('CGST')) e.cgst += l.amount
      else e.igst += l.amount
    }
    e.total += t.grandTotal
    byMonth.set(m, e)
  }
  const summary = [...byMonth.entries()].sort().map(([m, e]) => ({
    Month: m, 'Taxable Value': +e.taxable.toFixed(2), SGST: +e.sgst.toFixed(2),
    CGST: +e.cgst.toFixed(2), IGST: +e.igst.toFixed(2), 'Invoice Total': e.total,
  }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Register')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'GST Summary')
  XLSX.writeFile(wb, 'YouthClub-Register.xlsx')
}

export async function exportInvoiceDocx(inv: Invoice, client: Party, settings: Settings) {
  const { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } = await import('docx')
  const { columns, business } = settings
  const totals = computeTotals(inv, columns)
  const computed = inv.rows.map((r) => computeRow(r, columns))
  const headerRow = new TableRow({
    children: columns.map((c) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: c.label, bold: true, size: 14 })] })] })),
  })
  const bodyRows = computed.map((r) => new TableRow({
    children: columns.map((c) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(r[c.key] ?? ''), size: 14 })] })] })),
  }))
  const p = (text: string, opts: { bold?: boolean; size?: number } = {}) =>
    new Paragraph({ children: [new TextRun({ text, bold: opts.bold, size: opts.size ?? 20 })] })
  const doc = new Document({
    sections: [{
      children: [
        p(`${business.name} ${business.subName}`, { bold: true, size: 32 }),
        p(business.addressLine, { size: 18 }),
        p(`TAX INVOICE — ${inv.no}  |  Date: ${inv.date}`, { bold: true }),
        p(''),
        p(`Bill To: ${client.name}`, { bold: true }),
        ...(client.gst ? [p(`GST: ${client.gst}`, { size: 18 })] : []),
        ...client.address.map((l) => p(l, { size: 18 })),
        p(''),
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...bodyRows] }),
        p(''),
        ...(inv.feesPct > 0 ? [p(`${inv.feesPct}% ${settings.feesLabel}: ${totals.fees.toFixed(2)}`)] : []),
        p(`Sub Total: ${totals.subTotal.toFixed(2)}`, { bold: true }),
        ...totals.taxLines.map((t) => p(`${t.label}: ${t.amount.toFixed(2)}`)),
        p(`Round Off: ${totals.roundOff.toFixed(2)}`),
        p(`Grand Total: ${totals.grandTotal.toLocaleString('en-IN')}`, { bold: true, size: 24 }),
        p(amountInWordsINR(totals.grandTotal), { bold: true, size: 18 }),
        p(''),
        p(`Bank: ${business.bankName} | A/c: ${business.accountNo} | IFSC: ${business.ifsc}`, { size: 18 }),
      ],
    }],
  })
  const blob = await Packer.toBlob(doc)
  download(blob, invoiceFileBase(inv, client) + '.docx')
}
