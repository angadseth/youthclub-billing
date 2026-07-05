import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { computeTotals, fmtMoneyInt } from '../domain/calc'
import { fyLabel } from '../domain/invoiceNo'
import { useDB } from '../store/db'
import { Card, StatTile, btnPrimary } from '../components/ui'

// dataviz-validated palettes (light + dark, run through validate_palette.js)
const PAL = {
  light: { brand: '#c87b2a', paid: '#1f7a4d', pending: '#b45309', grid: '#e5e5e5', ink: '#525252' },
  dark: { brand: '#c87b2a', paid: '#2e9d68', pending: '#c2410c', grid: '#333333', ink: '#a3a3a3' },
}

function useThemePal() {
  const [dark, setDark] = useState(document.documentElement.classList.contains('dark'))
  useEffect(() => {
    const mo = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')))
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])
  return dark ? PAL.dark : PAL.light
}

const inr = (n: number) => '₹ ' + fmtMoneyInt(n)

export default function Dashboard() {
  const { clients, invoices, settings } = useDB()
  const pal = useThemePal()

  const data = useMemo(() => {
    const rows = invoices.map((inv) => ({ inv, t: computeTotals(inv, settings.columns) }))
    const now = new Date()
    const thisMonth = now.toISOString().slice(0, 7)
    const fy = fyLabel(now)

    const monthRows = rows.filter((r) => r.inv.date.startsWith(thisMonth))
    const fyRows = rows.filter((r) => fyLabel(new Date(r.inv.date)) === fy)
    const unpaid = rows.filter((r) => r.inv.status === 'UNPAID')

    // last 12 months trend
    const months: { m: string; label: string; total: number }[] = []
    for (let k = 11; k >= 0; k--) {
      const d = new Date(now.getFullYear(), now.getMonth() - k, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months.push({
        m: key,
        label: d.toLocaleDateString('en-GB', { month: 'short' }),
        total: rows.filter((r) => r.inv.date.startsWith(key)).reduce((a, r) => a + r.t.grandTotal, 0),
      })
    }

    const byClient = clients
      .map((c) => ({
        name: c.name.length > 14 ? c.name.slice(0, 13) + '…' : c.name,
        total: fyRows.filter((r) => r.inv.clientId === c.id).reduce((a, r) => a + r.t.grandTotal, 0),
      }))
      .filter((x) => x.total > 0)
      .sort((a, b) => b.total - a.total)

    const paidAmt = fyRows.filter((r) => r.inv.status === 'PAID').reduce((a, r) => a + r.t.grandTotal, 0)
    const pendingAmt = fyRows.filter((r) => r.inv.status === 'UNPAID').reduce((a, r) => a + r.t.grandTotal, 0)

    return {
      fy,
      monthBilled: monthRows.reduce((a, r) => a + r.t.grandTotal, 0),
      monthCount: monthRows.length,
      outstanding: unpaid.reduce((a, r) => a + r.t.grandTotal, 0),
      unpaidCount: unpaid.length,
      fyTotal: fyRows.reduce((a, r) => a + r.t.grandTotal, 0),
      gstCollected: fyRows.reduce((a, r) => a + r.t.taxLines.reduce((x, l) => x + l.amount, 0), 0),
      months,
      byClient,
      paidPending: [
        { name: 'Paid', value: paidAmt },
        { name: 'Baaki', value: pendingAmt },
      ],
    }
  }, [invoices, clients, settings.columns])

  const tooltipStyle = {
    background: 'var(--color-neutral-50, #fff)',
    border: `1px solid ${pal.grid}`,
    borderRadius: 8,
    fontSize: 12,
    color: '#333',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          FY {data.fy} · {clients.length} clients · {invoices.length} bills
        </p>
        <Link to="/new" className={btnPrimary}>Naya Bill / New Invoice</Link>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <StatTile accent label="Is month ka billing" value={inr(data.monthBilled)} sub={`${data.monthCount} / ${clients.length} bills bane`} />
        <StatTile label="Payment baaki" value={inr(data.outstanding)} sub={`${data.unpaidCount} unpaid bills`} />
        <StatTile label={`FY ${data.fy} total`} value={inr(data.fyTotal)} />
        <StatTile label="GST collected (FY)" value={inr(Math.round(data.gstCollected))} />
        <StatTile label="Clients" value={String(clients.length)} sub="Clients page se add/edit" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Monthly billing — last 12 months">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.months} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={pal.grid} strokeDasharray="0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: pal.ink }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: pal.ink }} axisLine={false} tickLine={false} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [inr(Number(v)), 'Billing']} />
              <Line type="monotone" dataKey="total" stroke={pal.brand} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title={`Client-wise revenue — FY ${data.fy}`}>
          {data.byClient.length === 0 ? (
            <p className="text-sm text-neutral-500 py-16 text-center">Is FY me abhi koi bill nahi.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.byClient} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: pal.ink }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [inr(Number(v)), 'Revenue']} />
                <Bar dataKey="total" fill={pal.brand} radius={[0, 4, 4, 0]} barSize={16} label={{ position: 'right', fontSize: 11, fill: pal.ink, formatter: (v) => { const n = Number(v); return n >= 1000 ? `${Math.round(n / 1000)}k` : String(n) } }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title={`Paid vs Baaki — FY ${data.fy}`}>
          {data.fyTotal === 0 ? (
            <p className="text-sm text-neutral-500 py-16 text-center">Data aayega jaise hi bills banenge.</p>
          ) : (
            <div className="flex items-center gap-6">
              <PieChart width={220} height={200}>
                  <Pie data={data.paidPending} dataKey="value" innerRadius={55} outerRadius={80} paddingAngle={2} strokeWidth={0}>
                    <Cell fill={pal.paid} />
                    <Cell fill={pal.pending} />
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [inr(Number(v)), String(n)]} />
              </PieChart>
              <div className="space-y-2 text-sm">
                {data.paidPending.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-sm" style={{ background: i === 0 ? pal.paid : pal.pending }} />
                    <span className="text-neutral-600 dark:text-neutral-300">{s.name}</span>
                    <span className="font-semibold tabular-nums">{inr(s.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card title="Shortcuts">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Link to="/bulk" className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 hover:border-brand-400 transition">
              <div className="font-semibold">Bulk billing</div>
              <div className="text-xs text-neutral-500 mt-1">Ek saath sabki attendance bharo, saare bills ban jayenge</div>
            </Link>
            <Link to="/register" className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 hover:border-brand-400 transition">
              <div className="font-semibold">Register + GST export</div>
              <div className="text-xs text-neutral-500 mt-1">Saare bills, paid/baaki status, Excel me GST summary</div>
            </Link>
            <Link to="/clients" className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 hover:border-brand-400 transition">
              <div className="font-semibold">Clients</div>
              <div className="text-xs text-neutral-500 mt-1">10 parties ke rates/address — ek baar set, hamesha auto</div>
            </Link>
            <Link to="/settings" className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 hover:border-brand-400 transition">
              <div className="font-semibold">Settings</div>
              <div className="text-xs text-neutral-500 mt-1">Columns, tax, GitHub sync, backup</div>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
