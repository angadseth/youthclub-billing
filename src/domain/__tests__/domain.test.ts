import { describe, expect, it } from 'vitest'
import { computeRow, computeTotals, evalFormula, round2 } from '../calc'
import { amountInWordsINR, numberToWordsIndian } from '../words'
import { nextInvoiceNo } from '../invoiceNo'
import { splitRowsIntoPages } from '../paginate'
import type { ColumnDef } from '../types'

const columns: ColumnDef[] = [
  { key: 'sno', label: 'S.No', width: 4, type: 'number' },
  { key: 'description', label: 'Description of Service', width: 16, type: 'text' },
  { key: 'sasCode', label: 'SAS Code', width: 6, type: 'text' },
  { key: 'from', label: 'From', width: 7, type: 'date' },
  { key: 'to', label: 'To', width: 7, type: 'date' },
  { key: 'units', label: 'Units', width: 5, type: 'number', sumInTotal: true },
  { key: 'basicSalary', label: 'Basic Salary', width: 7, type: 'number' },
  { key: 'days', label: 'Days', width: 5, type: 'number' },
  { key: 'ratePerDay', label: 'Rate/Day (₹)', width: 6, type: 'number' },
  { key: 'attend', label: 'Attend.', width: 5, type: 'number', sumInTotal: true },
  { key: 'holidays', label: 'Holidays', width: 5, type: 'number' },
  { key: 'totalDays', label: 'Total Days', width: 5, type: 'number', sumInTotal: true },
  { key: 'amount', label: 'Amount (₹)', width: 8, type: 'number', formula: 'ratePerDay * attend', sumInTotal: true },
]

const refRow = {
  sno: 1, description: 'Housekeeping Staff', sasCode: '998519',
  from: '2026-05-01', to: '2026-05-31',
  units: 1, basicSalary: 23, days: 23, ratePerDay: 56, attend: 27, holidays: 0, totalDays: 2,
}

describe('calc — reference invoice (YouthClub_Invoice_v2)', () => {
  it('computes row amount from formula', () => {
    expect(computeRow(refRow, columns).amount).toBe(1512)
  })
  it('matches every total on the reference PDF', () => {
    const t = computeTotals({ rows: [refRow], taxMode: 'CGST_SGST', taxRate: 18, feesPct: 10 }, columns)
    expect(t.basicTotal).toBe(1512)
    expect(t.fees).toBe(151.2)
    expect(t.subTotal).toBe(1663.2)
    expect(t.taxLines).toEqual([
      { label: 'SGST @ 9%', amount: 149.69 },
      { label: 'CGST @ 9%', amount: 149.69 },
    ])
    expect(t.grandTotal).toBe(1963)
    expect(t.roundOff).toBe(0.42)
    expect(t.columnTotals.amount).toBe(1512)
    expect(t.columnTotals.attend).toBe(27)
  })
  it('NONE tax mode → no tax lines, grand = rounded subtotal', () => {
    const t = computeTotals({ rows: [refRow], taxMode: 'NONE', taxRate: 18, feesPct: 10 }, columns)
    expect(t.taxLines).toEqual([])
    expect(t.grandTotal).toBe(1663)
    expect(t.roundOff).toBe(round2(1663 - 1663.2))
  })
  it('IGST mode → single line at full rate', () => {
    const t = computeTotals({ rows: [refRow], taxMode: 'IGST', taxRate: 18, feesPct: 10 }, columns)
    expect(t.taxLines).toEqual([{ label: 'IGST @ 18%', amount: 299.38 }])
  })
  it('evalFormula handles parens, precedence, unknown ids', () => {
    expect(evalFormula('(a + b) * 2', { a: 3, b: 4 })).toBe(14)
    expect(evalFormula('a + b * 2', { a: 3, b: 4 })).toBe(11)
    expect(evalFormula('missing * 5', {})).toBe(0)
    expect(evalFormula('a / 0', { a: 5 })).toBe(0)
  })
})

describe('amountInWordsINR', () => {
  it('reference grand total', () => {
    expect(amountInWordsINR(1963)).toBe('Rupees One Thousand Nine Hundred Sixty Three Only')
  })
  it('includes paise', () => {
    expect(amountInWordsINR(1663.2)).toBe('Rupees One Thousand Six Hundred Sixty Three and Twenty Paise Only')
  })
  it('crore/lakh', () => {
    expect(numberToWordsIndian(12345678)).toBe('One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight')
  })
  it('zero', () => {
    expect(amountInWordsINR(0)).toBe('Rupees Zero Only')
  })
})

describe('nextInvoiceNo — FY-wise', () => {
  it('first of FY', () => {
    expect(nextInvoiceNo([], new Date('2026-05-31'))).toBe('YC/26-27/001')
  })
  it('increments within FY', () => {
    expect(nextInvoiceNo(['YC/26-27/007', 'YC/25-26/099'], new Date('2026-06-01'))).toBe('YC/26-27/008')
  })
  it('resets in April', () => {
    expect(nextInvoiceNo(['YC/26-27/007'], new Date('2027-04-01'))).toBe('YC/27-28/001')
  })
})

describe('splitRowsIntoPages', () => {
  it('single page when rows fit', () => {
    expect(splitRowsIntoPages([1, 2, 3], 5, 8)).toEqual([[1, 2, 3]])
  })
  it('overflows to continuation pages', () => {
    expect(splitRowsIntoPages(Array(12).fill(0), 5, 8).map((p) => p.length)).toEqual([5, 7])
    expect(splitRowsIntoPages(Array(25).fill(0), 5, 8).map((p) => p.length)).toEqual([5, 8, 8, 4])
  })
})
