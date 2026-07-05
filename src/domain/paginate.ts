/**
 * Split table rows into pages: the first page holds fewer rows (totals block,
 * payment details etc. live there too when it's the last page); continuation
 * pages hold more.
 */
export function splitRowsIntoPages<T>(rows: T[], firstPageMax: number, nextPageMax: number, lastPageMax?: number): T[][] {
  const pages = splitPlain(rows, firstPageMax, nextPageMax)
  // the last page also carries the totals/payment/sign block — if it holds too
  // many rows, the block would overflow A4, so totals get their own page
  if (lastPageMax !== undefined && pages[pages.length - 1].length > lastPageMax) pages.push([])
  return pages
}

function splitPlain<T>(rows: T[], firstPageMax: number, nextPageMax: number): T[][] {
  if (rows.length <= firstPageMax) return [rows]
  const pages: T[][] = [rows.slice(0, firstPageMax)]
  let i = firstPageMax
  while (i < rows.length) {
    pages.push(rows.slice(i, i + nextPageMax))
    i += nextPageMax
  }
  return pages
}
