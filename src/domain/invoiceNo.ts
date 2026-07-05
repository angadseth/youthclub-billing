/** Financial year (April–March) label like "26-27" for a date. */
export function fyLabel(date: Date): string {
  const y = date.getFullYear()
  const startYear = date.getMonth() >= 3 ? y : y - 1
  const a = String(startYear % 100).padStart(2, '0')
  const b = String((startYear + 1) % 100).padStart(2, '0')
  return `${a}-${b}`
}

/**
 * Next invoice number in the FY of `date`: `YC/26-27/001`.
 * Scans existing numbers with the same prefix+FY and increments the max.
 */
export function nextInvoiceNo(existing: string[], date: Date, prefix = 'YC'): string {
  const fy = fyLabel(date)
  const head = `${prefix}/${fy}/`
  let max = 0
  for (const no of existing) {
    if (no.startsWith(head)) {
      const n = parseInt(no.slice(head.length), 10)
      if (Number.isFinite(n) && n > max) max = n
    }
  }
  return head + String(max + 1).padStart(3, '0')
}
