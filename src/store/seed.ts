import type { ColumnDef, Party, Settings } from '../domain/types'

export const defaultColumns: ColumnDef[] = [
  { key: 'sno', label: 'S.No', width: 4, type: 'number', align: 'center' },
  { key: 'description', label: 'Description of Service', width: 16, type: 'text', align: 'left' },
  { key: 'sasCode', label: 'SAS Code', width: 6, type: 'text', align: 'center' },
  { key: 'from', label: 'From', width: 7, type: 'date', align: 'center' },
  { key: 'to', label: 'To', width: 7, type: 'date', align: 'center' },
  { key: 'units', label: 'Units', width: 5, type: 'number', align: 'center', sumInTotal: true },
  { key: 'basicSalary', label: 'Basic Salary', width: 7, type: 'number', align: 'center' },
  { key: 'days', label: 'Days', width: 5, type: 'number', align: 'center' },
  { key: 'ratePerDay', label: 'Rate/Day (₹)', width: 6, type: 'number', align: 'center' },
  { key: 'attend', label: 'Attend.', width: 5, type: 'number', align: 'center', sumInTotal: true },
  { key: 'holidays', label: 'Holidays', width: 5, type: 'number', align: 'center' },
  { key: 'totalDays', label: 'Total Days', width: 5, type: 'number', align: 'center', sumInTotal: true },
  { key: 'amount', label: 'Amount (₹)', width: 8, type: 'number', align: 'right', formula: 'ratePerDay * attend', sumInTotal: true },
]

export const defaultSettings: Settings = {
  business: {
    name: 'YOUTHCLUB',
    subName: 'SECURITIES SERVICES',
    addressLine: 'A-231 RIICO Phase-02, Jhunjhunu - 333001, Rajasthan',
    addressShort: 'A-231 RIICO Phase-02, Jhunjhunu',
    email: 'youthclubsecuritiesservices@gmail.com',
    phone: '+91-8696552552',
    gst: '08AJKPD0464A1ZR',
    pan: 'AJKPD0464A',
    bankName: 'State Bank of India - Jhunjhunu',
    accountNo: '000000441303335918',
    ifsc: 'SBIN0015991',
    terms: [
      'We declare that this Invoice shows the actual price of items described and all particulars are true and correct.',
      'Please make all cheques payable to M/s YouthClub Securities Services.',
    ],
    upiId: '',
  },
  columns: defaultColumns,
  feesPct: 10,
  feesLabel: 'Management Fees',
  taxMode: 'CGST_SGST',
  taxRate: 18,
  invoicePrefix: 'YC',
  copyLabel: 'ORIGINAL COPY',
  showUpiQr: false,
}

export const seedClients: Party[] = [
  {
    id: 'kaivlaya',
    name: 'Kaivlaya Education Foundation',
    gst: '27AADCK5957A1ZL',
    clCode: '10019',
    address: [
      'Piramal School of Leadership, Piramal Nagar',
      'Near B.Ed College, Bagar, Jhunjhunu - 333023',
    ],
    stateName: 'Rajasthan',
    stateCode: '08',
    phone: '+91-8696552552',
    email: 'youthclubsecuritiesservices@gmail.com',
    dueDays: 30,
    defaultRows: [
      {
        sno: 1,
        description: 'Housekeeping Staff',
        sasCode: '998519',
        from: '',
        to: '',
        units: 1,
        basicSalary: 23,
        days: 23,
        ratePerDay: 56,
        attend: 0,
        holidays: 0,
        totalDays: 0,
      },
    ],
  },
]
