/**
 * Split table rows into pages: the first page holds fewer rows (totals block,
 * payment details etc. live there too when it's the last page); continuation
 * pages hold more.
 */
export function splitRowsIntoPages<T>(rows: T[], firstPageMax: number, nextPageMax: number): T[][] {
  if (rows.length <= firstPageMax) return [rows]
  const pages: T[][] = [rows.slice(0, firstPageMax)]
  let i = firstPageMax
  while (i < rows.length) {
    pages.push(rows.slice(i, i + nextPageMax))
    i += nextPageMax
  }
  return pages
}
