const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
  'Eighteen', 'Nineteen',
]
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function twoDigits(n: number): string {
  if (n < 20) return ones[n]
  const t = Math.floor(n / 10)
  const o = n % 10
  return tens[t] + (o ? ' ' + ones[o] : '')
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100)
  const rest = n % 100
  const parts: string[] = []
  if (h) parts.push(ones[h] + ' Hundred')
  if (rest) parts.push(twoDigits(rest))
  return parts.join(' ')
}

/** Indian numbering system: crore / lakh / thousand / hundred. */
export function numberToWordsIndian(n: number): string {
  if (n === 0) return 'Zero'
  const parts: string[] = []
  const crore = Math.floor(n / 10000000)
  const lakh = Math.floor((n % 10000000) / 100000)
  const thousand = Math.floor((n % 100000) / 1000)
  const rest = n % 1000
  if (crore) parts.push(numberToWordsIndian(crore) + ' Crore')
  if (lakh) parts.push(twoDigits(lakh) + ' Lakh')
  if (thousand) parts.push(twoDigits(thousand) + ' Thousand')
  if (rest) parts.push(threeDigits(rest))
  return parts.join(' ')
}

/** "Rupees One Thousand Nine Hundred Sixty Three Only" (+ paise when present). */
export function amountInWordsINR(amount: number): string {
  const rupees = Math.floor(amount)
  const paise = Math.round((amount - rupees) * 100)
  let s = 'Rupees ' + (rupees === 0 ? 'Zero' : numberToWordsIndian(rupees))
  if (paise > 0) s += ' and ' + twoDigits(paise) + ' Paise'
  return s + ' Only'
}
