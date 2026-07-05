import type { ColumnDef, Invoice, ServiceRow, TaxLine, Totals } from './types'

export const round2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100

/**
 * Safe arithmetic expression evaluator over row fields.
 * Supports numbers, identifiers, + - * / and parentheses. No user JS is executed.
 */
export function evalFormula(expr: string, row: ServiceRow): number {
  const tokens = tokenize(expr)
  let pos = 0

  const peek = () => tokens[pos]
  const next = () => tokens[pos++]

  function parseExpr(): number {
    let v = parseTerm()
    while (peek() === '+' || peek() === '-') {
      const op = next()
      const r = parseTerm()
      v = op === '+' ? v + r : v - r
    }
    return v
  }
  function parseTerm(): number {
    let v = parseFactor()
    while (peek() === '*' || peek() === '/') {
      const op = next()
      const r = parseFactor()
      v = op === '*' ? v * r : r === 0 ? 0 : v / r
    }
    return v
  }
  function parseFactor(): number {
    const t = next()
    if (t === undefined) return 0
    if (t === '(') {
      const v = parseExpr()
      if (peek() === ')') next()
      return v
    }
    if (t === '-') return -parseFactor()
    if (/^[0-9.]/.test(t)) return parseFloat(t)
    // identifier → row value
    const raw = row[t]
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''))
    return Number.isFinite(n) ? n : 0
  }

  const result = parseExpr()
  return Number.isFinite(result) ? result : 0
}

function tokenize(expr: string): string[] {
  const out: string[] = []
  const re = /\s*([A-Za-z_][A-Za-z0-9_]*|[0-9]*\.?[0-9]+|[()+\-*/])/g
  let m: RegExpExecArray | null
  while ((m = re.exec(expr)) !== null) out.push(m[1])
  return out
}

/** Returns the row with all formula columns computed (rounded to 2dp). */
export function computeRow(row: ServiceRow, columns: ColumnDef[]): ServiceRow {
  const out: ServiceRow = { ...row }
  for (const col of columns) {
    if (col.formula) out[col.key] = round2(evalFormula(col.formula, out))
  }
  return out
}

export function computeTotals(
  inv: Pick<Invoice, 'rows' | 'taxMode' | 'taxRate' | 'feesPct'>,
  columns: ColumnDef[],
): Totals {
  const computed = inv.rows.map((r) => computeRow(r, columns))
  const rowAmounts = computed.map((r) => round2(Number(r.amount) || 0))
  const basicTotal = round2(rowAmounts.reduce((a, b) => a + b, 0))
  const fees = round2((basicTotal * (inv.feesPct || 0)) / 100)
  const subTotal = round2(basicTotal + fees)

  const taxLines: TaxLine[] = []
  if (inv.taxMode === 'CGST_SGST') {
    const half = inv.taxRate / 2
    const amt = round2((subTotal * half) / 100)
    taxLines.push({ label: `SGST @ ${fmtPct(half)}%`, amount: amt })
    taxLines.push({ label: `CGST @ ${fmtPct(half)}%`, amount: amt })
  } else if (inv.taxMode === 'IGST') {
    taxLines.push({ label: `IGST @ ${fmtPct(inv.taxRate)}%`, amount: round2((subTotal * inv.taxRate) / 100) })
  }

  const exact = round2(subTotal + taxLines.reduce((a, t) => a + t.amount, 0))
  const grandTotal = Math.round(exact)
  const roundOff = round2(grandTotal - exact)

  const columnTotals: Record<string, number> = {}
  for (const col of columns) {
    if (col.sumInTotal) {
      columnTotals[col.key] = round2(
        computed.reduce((a, r) => a + (Number(r[col.key]) || 0), 0),
      )
    }
  }

  return { rowAmounts, basicTotal, fees, subTotal, taxLines, grandTotal, roundOff, columnTotals }
}

const fmtPct = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

export const fmtMoney = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const fmtMoneyInt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
