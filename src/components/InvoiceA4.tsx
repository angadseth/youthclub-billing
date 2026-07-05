import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import type { Invoice, Party, Settings } from '../domain/types'
import { computeRow, computeTotals, fmtMoney, fmtMoneyInt } from '../domain/calc'
import { amountInWordsINR } from '../domain/words'
import { splitRowsIntoPages } from '../domain/paginate'
import defaultLogo from '../assets/logo.png'

const ORANGE = '#c87b2a'
const ORANGE_DARK = '#b06420'
const INK = '#1f2430'
const PEACH = '#f8ecdd'

export const ROWS_FIRST_PAGE = 12
export const ROWS_NEXT_PAGE = 16
export const ROWS_LAST_PAGE = 8 // last page also holds totals/sign block

export function invoicePageCount(rowCount: number): number {
  return splitRowsIntoPages(Array(rowCount).fill(0), ROWS_FIRST_PAGE, ROWS_NEXT_PAGE, ROWS_LAST_PAGE).length
}

export function fmtDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''))
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function Logo({ dataUrl }: { dataUrl?: string }) {
  return <img src={dataUrl || defaultLogo} alt="logo" style={{ width: '25mm', height: '25mm', objectFit: 'contain' }} />
}

interface Props {
  invoice: Invoice
  client: Party
  settings: Settings
}

/** Pixel-matched A4 invoice. Renders one or more `.a4page` divs. */
export default function InvoiceA4({ invoice, client, settings }: Props) {
  const { columns, business } = settings
  const totals = computeTotals(invoice, columns)
  const computedRows = invoice.rows.map((r) => computeRow(r, columns))
  const pages = splitRowsIntoPages(computedRows, ROWS_FIRST_PAGE, ROWS_NEXT_PAGE, ROWS_LAST_PAGE)
  const totalWeight = columns.reduce((a, c) => a + c.width, 0)
  // auto text scale: 13 default columns look right at 2.5mm; shrink as columns grow
  const tableFont = Math.min(2.5, 2.5 * (86 / totalWeight))

  const [qr, setQr] = useState('')
  useEffect(() => {
    if (settings.showUpiQr && business.upiId) {
      const upi = `upi://pay?pa=${encodeURIComponent(business.upiId)}&pn=${encodeURIComponent(business.name)}&am=${totals.grandTotal}&cu=INR`
      QRCode.toDataURL(upi, { margin: 0, width: 160 }).then(setQr).catch(() => setQr(''))
    } else setQr('')
  }, [settings.showUpiQr, business.upiId, business.name, totals.grandTotal])

  const cellStyle = (align?: string): React.CSSProperties => ({
    padding: '1.2mm 1mm',
    textAlign: (align as never) || 'center',
    fontSize: `${tableFont}mm`,
    borderRight: '0.2mm solid #e8e0d5',
    overflowWrap: 'anywhere',
  })

  return (
    <>
      {pages.map((pageRows, pi) => {
        const isLast = pi === pages.length - 1
        return (
          <div key={pi} className="a4page" style={{ display: 'flex', flexDirection: 'column', height: '297mm', overflow: 'hidden', fontFamily: 'Inter, "Segoe UI", sans-serif' }}>
            {/* top bar */}
            <div style={{ height: '5mm', background: ORANGE, display: 'flex', justifyContent: 'space-between', padding: '0 8mm' }}>
              <div style={{ width: '10mm', height: '3mm', background: INK, marginTop: '1mm' }} />
              <div style={{ width: '10mm', height: '3mm', background: INK, marginTop: '1mm' }} />
            </div>

            {/* header */}
            <div style={{ display: 'flex', padding: '4mm 8mm 2mm', gap: '5mm', alignItems: 'flex-start' }}>
              <Logo dataUrl={business.logoDataUrl} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '8.5mm', fontWeight: 800, letterSpacing: '0.5mm', color: '#3a3a3a', lineHeight: 1 }}>{business.name}</div>
                <div style={{ fontSize: '4mm', fontWeight: 700, letterSpacing: '1.2mm', color: '#4a4a4a', marginTop: '1mm' }}>{business.subName}</div>
                <div style={{ fontSize: '2.6mm', color: '#555', marginTop: '2mm' }}>{business.addressLine}</div>
                <div style={{ fontSize: '2.6mm', color: '#555', fontStyle: 'italic' }}>
                  {business.email} &nbsp;|&nbsp; {business.phone}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '8mm', fontWeight: 900, color: '#111' }}>TAX INVOICE</div>
                <div style={{ fontSize: '2.8mm', color: '#666', marginTop: '3mm' }}>{settings.copyLabel}</div>
              </div>
            </div>

            {/* invoice no / date strip */}
            <div style={{ margin: '0 0mm', background: ORANGE, color: '#fff', display: 'flex', justifyContent: 'space-between', padding: '1.6mm 8mm', fontSize: '2.8mm', fontWeight: 700 }}>
              <span>INVOICE NO : {invoice.no || '_______________'}</span>
              <span>DATE : {fmtDate(invoice.date)}</span>
            </div>

            {/* parties */}
            <div style={{ display: 'flex', gap: '1mm', marginTop: '1.5mm' }}>
              <div style={{ flex: 1, background: INK, color: '#fff', padding: '3mm 8mm 3mm', minHeight: '40mm' }}>
                <div style={{ fontStyle: 'italic', fontWeight: 700, fontSize: '3.2mm', marginBottom: '2mm' }}>Bill To :</div>
                <div style={{ fontWeight: 700, fontSize: '3.4mm', marginBottom: '1.5mm' }}>{client.name}</div>
                {client.gst && <div style={{ fontSize: '2.7mm', opacity: 0.9 }}>GST: {client.gst}</div>}
                {client.clCode && <div style={{ fontSize: '2.7mm', opacity: 0.9 }}>CL Code: {client.clCode}</div>}
                {client.address.map((l, i) => (
                  <div key={i} style={{ fontSize: '2.7mm', opacity: 0.9 }}>{l}</div>
                ))}
                {client.stateName && (
                  <div style={{ fontSize: '2.7mm', opacity: 0.9, marginTop: '1.5mm' }}>
                    State: {client.stateName} &nbsp;|&nbsp; Code: {client.stateCode}
                  </div>
                )}
              </div>
              <div style={{ flex: 1, background: INK, color: '#fff', padding: '3mm 8mm 3mm', minHeight: '40mm', borderLeft: `0.5mm solid ${ORANGE}` }}>
                <div style={{ fontStyle: 'italic', fontWeight: 700, fontSize: '3.2mm', marginBottom: '2mm' }}>Billed By :</div>
                <div style={{ fontWeight: 700, fontSize: '3.4mm', marginBottom: '1.5mm' }}>
                  {business.name.charAt(0) + business.name.slice(1).toLowerCase()} {business.subName.split(' ').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}
                </div>
                <div style={{ fontSize: '2.7mm', opacity: 0.9 }}>GST: {business.gst}</div>
                <div style={{ fontSize: '2.7mm', opacity: 0.9 }}>PAN: {business.pan}</div>
                <div style={{ fontSize: '2.7mm', opacity: 0.9 }}>{business.addressLine}</div>
              </div>
            </div>

            {/* service table */}
            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', marginTop: '1.5mm' }}>
              <thead>
                <tr style={{ background: ORANGE_DARK, color: '#fff' }}>
                  {columns.map((c) => (
                    <th key={c.key} style={{ ...cellStyle(c.align), fontWeight: 700, width: `${(c.width / totalWeight) * 100}%`, borderRight: '0.2mm solid rgba(255,255,255,0.25)', fontSize: `${tableFont * 0.88}mm`, overflowWrap: 'normal' }}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, ri) => (
                  <tr key={ri} style={{ borderBottom: '0.2mm solid #eee4d6', height: '11mm' }}>
                    {columns.map((c) => (
                      <td key={c.key} style={{ ...cellStyle(c.align), fontWeight: c.key === 'description' || c.key === 'amount' ? 700 : 400 }}>
                        {c.type === 'date' ? fmtDate(String(row[c.key] ?? '')) : c.type === 'number' && c.key === 'amount' ? fmtMoney(Number(row[c.key]) || 0) : String(row[c.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
                {isLast && (
                  <tr style={{ background: PEACH, fontWeight: 700, height: '9mm' }}>
                    {columns.map((c, i) => (
                      <td key={c.key} style={cellStyle(c.align)}>
                        {i === 1 ? 'TOTAL' : c.sumInTotal ? (c.key === 'amount' ? fmtMoney(totals.columnTotals[c.key] ?? 0) : totals.columnTotals[c.key]) : ''}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>

            <div style={{ flex: 1 }} />

            {isLast && (
              <>
                {/* payment details + totals */}
                <div style={{ display: 'flex', padding: '0 0mm', gap: '0mm' }}>
                  <div style={{ flex: 1.1, background: '#f5f2ec', padding: '3mm 8mm' }}>
                    <div style={{ color: ORANGE_DARK, fontWeight: 700, fontSize: '3mm', marginBottom: '2mm' }}>Payment Details</div>
                    <table style={{ fontSize: '2.8mm', borderSpacing: 0 }}>
                      <tbody>
                        <tr><td style={{ color: '#777', paddingRight: '4mm', verticalAlign: 'top' }}>Bank</td><td>{business.bankName}</td></tr>
                        <tr><td style={{ color: '#777', paddingRight: '4mm', verticalAlign: 'top' }}>Account No.</td><td>{business.accountNo}</td></tr>
                        <tr><td style={{ color: '#777', paddingRight: '4mm', verticalAlign: 'top' }}>IFSC</td><td>{business.ifsc}</td></tr>
                      </tbody>
                    </table>
                    {qr && (
                      <div style={{ display: 'flex', gap: '3mm', alignItems: 'center', marginTop: '2mm' }}>
                        <img src={qr} style={{ width: '16mm', height: '16mm' }} alt="UPI QR" />
                        <div style={{ fontSize: '2.4mm', color: '#777' }}>Scan to pay via UPI<br />{business.upiId}</div>
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, background: '#faf7f2', padding: '2mm 8mm', fontSize: '2.9mm' }}>
                    {invoice.feesPct > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.4mm 0', borderBottom: '0.2mm solid #eadfce' }}>
                        <span>{invoice.feesPct}% {settings.feesLabel}</span><span>{fmtMoney(totals.fees)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.4mm 0', borderBottom: '0.2mm solid #eadfce', fontWeight: 700 }}>
                      <span>Sub Total</span><span>{fmtMoney(totals.subTotal)}</span>
                    </div>
                    {totals.taxLines.map((t) => (
                      <div key={t.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '1.4mm 0', borderBottom: '0.2mm solid #eadfce' }}>
                        <span>{t.label}</span><span>{fmtMoney(t.amount)}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.4mm 0', fontStyle: 'italic', color: '#555' }}>
                      <span>Round Off</span><span>{totals.roundOff.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* grand total band */}
                <div style={{ background: ORANGE_DARK, color: '#fff', display: 'flex', justifyContent: 'space-between', padding: '2mm 8mm', fontWeight: 800, fontSize: '3.6mm' }}>
                  <span>Grand Total :</span><span>{fmtMoneyInt(totals.grandTotal)}</span>
                </div>
                <div style={{ padding: '2.5mm 8mm', fontStyle: 'italic', fontWeight: 700, fontSize: '3mm', color: ORANGE_DARK }}>
                  Amount in Words : &nbsp;{amountInWordsINR(totals.grandTotal)}
                </div>

                {/* terms + sign */}
                <div style={{ display: 'flex', padding: '2mm 8mm 4mm', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1.4 }}>
                    <div style={{ fontWeight: 700, fontSize: '3mm', marginBottom: '1.5mm' }}>Terms &amp; Conditions / Notes :</div>
                    {business.terms.map((t, i) => (
                      <div key={i} style={{ fontSize: '2.6mm', color: '#555', marginBottom: '0.8mm' }}>{i + 1}. {t}</div>
                    ))}
                    {invoice.notes && <div style={{ fontSize: '2.6mm', color: '#555', marginTop: '1mm' }}>{invoice.notes}</div>}
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '3.2mm', marginBottom: '26mm' }}>Authorised Sign</div>
                    <div style={{ fontWeight: 700, fontSize: '3mm', color: ORANGE_DARK, borderBottom: `0.6mm solid ${ORANGE_DARK}`, display: 'inline-block', paddingBottom: '0.6mm' }}>
                      {business.name.charAt(0) + business.name.slice(1).toLowerCase()}{' '}
                      {business.subName.split(' ').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}
                    </div>
                    <div style={{ fontStyle: 'italic', fontSize: '2.7mm', color: '#777', marginTop: '1mm' }}>Authorized Signatory</div>
                  </div>
                </div>
              </>
            )}

            {/* footer strip */}
            <div style={{ background: ORANGE, color: '#fff', display: 'flex', justifyContent: 'space-between', padding: '1.8mm 8mm', fontSize: '2.6mm' }}>
              <span>{business.phone} &nbsp;|&nbsp; Mobile</span>
              <span>{business.email}</span>
              <span>{business.addressShort}</span>
            </div>
            <div style={{ textAlign: 'center', fontSize: '2.6mm', color: '#888', padding: '1.5mm 0' }}>
              {pi + 1} of {pages.length}
            </div>
          </div>
        )
      })}
    </>
  )
}
