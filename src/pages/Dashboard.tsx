import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import StatusSelect from '../components/StatusSelect'
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
    // drafts are work-in-progress: excluded from every money figure/graph
    const draftCount = invoices.filter((i) => i.status === 'DRAFT').length
    const rows = invoices.filter((i) => i.status !== 'DRAFT').map((inv) => ({ inv, t: computeTotals(inv, settings.columns) }))
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

    // cumulative revenue across the last 12 months
    let running = 0
    const cumulative = months.map((m) => { running += m.total; return { label: m.label, cum: running } })

    // outstanding (unpaid) by client
    const outstandingByClient = clients
      .map((c) => ({
        name: c.name.length > 14 ? c.name.slice(0, 13) + '\u2026' : c.name,
        due: rows.filter((r) => r.inv.clientId === c.id && r.inv.status === 'UNPAID').reduce((a, r) => a + r.t.grandTotal, 0),
      }))
      .filter((x) => x.due > 0)
      .sort((a, b) => b.due - a.due)

    // average days from invoice date to payment, per month of payment
    const collection = months.map((m) => {
      const paidIn = rows.filter((r) => r.inv.status === 'PAID' && r.inv.paidOn?.startsWith(m.m))
      const avg = paidIn.length
        ? Math.round(paidIn.reduce((a, r) => a + Math.max(0, (new Date(r.inv.paidOn!).getTime() - new Date(r.inv.date).getTime()) / 86400000), 0) / paidIn.length)
        : null
      return { label: m.label, days: avg }
    })

    // recently edited bills (drafts included)
    const recent = [...invoices]
      .filter((i) => i.updatedAt)
      .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
      .slice(0, 6)

    return {
      fy,
      draftCount,
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
        { name: 'Due', value: pendingAmt },
      ],
      cumulative,
      outstandingByClient,
      collection,
      recent,
    }
  }, [invoices, clients, settings.columns])

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? id
  const timeAgo = (iso?: string) => {
    if (!iso) return ''
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins} min ago`
    const h = Math.floor(mins / 60)
    if (h < 24) return `${h} hr ago`
    const d = Math.floor(h / 24)
    return d === 1 ? 'yesterday' : `${d} days ago`
  }

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
        <Link to="/new" className={btnPrimary}>New Invoice</Link>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <StatTile accent label="This month billing" value={inr(data.monthBilled)} sub={`${data.monthCount} / ${clients.length} bills created`} />
        <StatTile label="Payment due" value={inr(data.outstanding)} sub={`${data.unpaidCount} unpaid${data.draftCount ? ` · ${data.draftCount} draft` : ''}`} />
        <StatTile label={`FY ${data.fy} total`} value={inr(data.fyTotal)} />
        <StatTile label="GST collected (FY)" value={inr(Math.round(data.gstCollected))} />
        <StatTile label="Clients" value={String(clients.length)} sub="Add/edit on Clients page" />
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
            <p className="text-sm text-neutral-500 py-16 text-center">No bills in this FY yet.</p>
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

        <Card title={`Paid vs Due — FY ${data.fy}`}>
          {data.fyTotal === 0 ? (
            <p className="text-sm text-neutral-500 py-16 text-center">Data appears as soon as bills are created.</p>
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

        <Card title="Recent activity" action={<Link to="/bills" className="text-xs font-medium text-brand-600 hover:underline">All bills →</Link>}>
          {data.recent.length === 0 ? (
            <p className="text-sm text-neutral-500 py-8 text-center">Nothing yet — bills you create or edit show up here.</p>
          ) : (
            <div className="space-y-1">
              {data.recent.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{inv.no} · {clientName(inv.clientId)}</div>
                    <div className="text-xs text-neutral-500">last edited {timeAgo(inv.updatedAt)}</div>
                  </div>
                  <StatusSelect invoice={inv} />
                  <Link className="text-xs font-medium text-brand-600 hover:underline shrink-0" to={`/new?client=${inv.clientId}&month=${inv.periodTo.slice(0, 7)}`}>Open</Link>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Cumulative revenue — last 12 months">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.cumulative} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cumFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={pal.brand} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={pal.brand} stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={pal.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: pal.ink }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: pal.ink }} axisLine={false} tickLine={false} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [inr(Number(v)), 'Total billed so far']} />
              <Area type="monotone" dataKey="cum" stroke={pal.brand} strokeWidth={2} fill="url(#cumFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Outstanding by client (who owes you)">
          {data.outstandingByClient.length === 0 ? (
            <p className="text-sm text-neutral-500 py-16 text-center">Nothing outstanding — all caught up.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.outstandingByClient} layout="vertical" margin={{ top: 4, right: 44, left: 8, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: pal.ink }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [inr(Number(v)), 'Due']} />
                <Bar dataKey="due" fill={pal.pending} radius={[0, 4, 4, 0]} barSize={16} label={{ position: 'right', fontSize: 11, fill: pal.ink, formatter: (v) => { const n = Number(v); return n >= 1000 ? `${Math.round(n / 1000)}k` : String(n) } }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Average days to get paid (per month)">
          {data.collection.every((c) => c.days === null) ? (
            <p className="text-sm text-neutral-500 py-16 text-center">Appears once bills start getting marked Paid.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.collection} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={pal.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: pal.ink }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: pal.ink }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} days`, 'Avg collection time']} />
                <Line type="monotone" dataKey="days" stroke={pal.paid} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Shortcuts">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Link to="/bulk" className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 hover:border-brand-400 transition">
              <div className="font-semibold">Bulk billing</div>
              <div className="text-xs text-neutral-500 mt-1">Fill attendance for everyone at once and generate all bills</div>
            </Link>
            <Link to="/register" className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 hover:border-brand-400 transition">
              <div className="font-semibold">Register + GST export</div>
              <div className="text-xs text-neutral-500 mt-1">All bills, paid/due status, GST summary in Excel</div>
            </Link>
            <Link to="/clients" className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 hover:border-brand-400 transition">
              <div className="font-semibold">Clients</div>
              <div className="text-xs text-neutral-500 mt-1">Party rates and addresses — set once, auto-filled forever</div>
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
