export type TaxMode = 'CGST_SGST' | 'IGST' | 'NONE'

export type InvoiceStatus = 'DRAFT' | 'UNPAID' | 'PAID'

export interface ColumnDef {
  key: string
  label: string
  width: number // relative weight for table layout
  align?: 'left' | 'center' | 'right'
  type: 'text' | 'number' | 'date'
  formula?: string // expression over other keys, e.g. "ratePerDay * attend"
  sumInTotal?: boolean // show a sum in the TOTAL row
}

export type ServiceRow = Record<string, string | number>

export interface Party {
  id: string
  name: string
  gst?: string
  clCode?: string
  address: string[]
  stateName?: string
  stateCode?: string
  phone?: string
  email?: string
  dueDays: number
  defaultRows: ServiceRow[]
  taxMode?: TaxMode // override, e.g. NONE for non-GST clients
}

export interface BusinessProfile {
  name: string
  subName: string
  addressLine: string
  addressShort: string
  email: string
  phone: string
  gst: string
  pan: string
  bankName: string
  accountNo: string
  ifsc: string
  terms: string[]
  upiId?: string
  logoDataUrl?: string
}

export interface Settings {
  business: BusinessProfile
  columns: ColumnDef[]
  feesPct: number
  feesLabel: string
  taxMode: TaxMode
  taxRate: number // total GST %, split for CGST/SGST
  invoicePrefix: string
  copyLabel: string
  showUpiQr: boolean
}

export interface Invoice {
  id: string // `${period}_${clientId}`
  no: string
  date: string // ISO yyyy-mm-dd
  clientId: string
  periodFrom: string
  periodTo: string
  rows: ServiceRow[]
  taxMode: TaxMode
  taxRate: number
  feesPct: number
  status: InvoiceStatus
  paidOn?: string
  updatedAt?: string // ISO datetime of last save
  notes?: string
}

export interface TaxLine {
  label: string
  amount: number
}

export interface Totals {
  rowAmounts: number[]
  basicTotal: number
  fees: number
  subTotal: number
  taxLines: TaxLine[]
  grandTotal: number
  roundOff: number
  columnTotals: Record<string, number>
}
