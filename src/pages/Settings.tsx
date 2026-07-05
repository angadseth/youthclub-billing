import { useEffect, useRef, useState } from 'react'
import type { ColumnDef, Settings as TSettings, TaxMode } from '../domain/types'
import { getState, importBackup, pullAll, saveSettings, useDB } from '../store/db'
import { defaultColumns } from '../store/seed'
import { flushQueue, getRepoConfig, getToken, onSyncStatus, pendingCount, setRepoConfig, setToken, type SyncStatus } from '../store/github'
import { download } from '../export/files'
import { Card, Field, btnGhost, btnPrimary, inputCls } from '../components/ui'

export default function SettingsPage() {
  const { settings } = useDB()
  const [s, setS] = useState<TSettings>(settings)
  const [saved, setSaved] = useState(false)
  useEffect(() => setS(settings), [settings])

  const save = () => {
    saveSettings(s)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const setBiz = (k: string, v: string) => setS({ ...s, business: { ...s.business, [k]: v } })

  const setCol = (i: number, patch: Partial<ColumnDef>) =>
    setS({ ...s, columns: s.columns.map((c, j) => (j === i ? { ...c, ...patch } : c)) })

  const logoInput = useRef<HTMLInputElement>(null)

  // GitHub sync
  const repo = getRepoConfig()
  const [owner, setOwner] = useState(repo?.owner ?? '')
  const [repoName, setRepoName] = useState(repo?.repo ?? '')
  const [token, setTok] = useState(getToken())
  const [sync, setSync] = useState<SyncStatus>({ state: 'off' })
  const [pulling, setPulling] = useState('')
  useEffect(() => onSyncStatus(setSync), [])

  const backupInput = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <button className={btnPrimary} onClick={save}>Save settings</button>
        {saved && <span className="text-xs font-medium text-green-600">Saved ✓</span>}
      </div>

      <Card title="Business profile (Billed By + header)">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Business name"><input className={inputCls} value={s.business.name} onChange={(e) => setBiz('name', e.target.value)} /></Field>
          <Field label="Sub-name"><input className={inputCls} value={s.business.subName} onChange={(e) => setBiz('subName', e.target.value)} /></Field>
          <Field label="GST"><input className={inputCls} value={s.business.gst} onChange={(e) => setBiz('gst', e.target.value)} /></Field>
          <Field label="PAN"><input className={inputCls} value={s.business.pan} onChange={(e) => setBiz('pan', e.target.value)} /></Field>
          <Field label="Phone"><input className={inputCls} value={s.business.phone} onChange={(e) => setBiz('phone', e.target.value)} /></Field>
          <Field label="Email"><input className={inputCls} value={s.business.email} onChange={(e) => setBiz('email', e.target.value)} /></Field>
          <div className="sm:col-span-2">
            <Field label="Address (full)"><input className={inputCls} value={s.business.addressLine} onChange={(e) => setBiz('addressLine', e.target.value)} /></Field>
          </div>
          <Field label="Address (short, footer)"><input className={inputCls} value={s.business.addressShort} onChange={(e) => setBiz('addressShort', e.target.value)} /></Field>
          <Field label="Bank"><input className={inputCls} value={s.business.bankName} onChange={(e) => setBiz('bankName', e.target.value)} /></Field>
          <Field label="Account No"><input className={inputCls} value={s.business.accountNo} onChange={(e) => setBiz('accountNo', e.target.value)} /></Field>
          <Field label="IFSC"><input className={inputCls} value={s.business.ifsc} onChange={(e) => setBiz('ifsc', e.target.value)} /></Field>
          <div className="sm:col-span-2">
            <Field label="Terms & Conditions (one per line)">
              <textarea className={inputCls} rows={3} value={s.business.terms.join('\n')} onChange={(e) => setS({ ...s, business: { ...s.business, terms: e.target.value.split('\n').filter(Boolean) } })} />
            </Field>
          </div>
          <div>
            <span className="mb-1 block text-xs font-medium text-neutral-500">Logo</span>
            <div className="flex items-center gap-3">
              {s.business.logoDataUrl && <img src={s.business.logoDataUrl} className="h-10 w-10 object-contain" alt="logo" />}
              <button className={btnGhost} onClick={() => logoInput.current?.click()}>Upload</button>
              {s.business.logoDataUrl && <button className={btnGhost} onClick={() => setBiz('logoDataUrl', '')}>Remove</button>}
              <input ref={logoInput} type="file" accept="image/*" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f) return
                const r = new FileReader()
                r.onload = () => setBiz('logoDataUrl', String(r.result))
                r.readAsDataURL(f)
              }} />
            </div>
          </div>
        </div>
      </Card>

      <Card title="Invoice defaults">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Invoice prefix"><input className={inputCls} value={s.invoicePrefix} onChange={(e) => setS({ ...s, invoicePrefix: e.target.value })} /></Field>
          <Field label="Copy label"><input className={inputCls} value={s.copyLabel} onChange={(e) => setS({ ...s, copyLabel: e.target.value })} /></Field>
          <Field label="Fees label"><input className={inputCls} value={s.feesLabel} onChange={(e) => setS({ ...s, feesLabel: e.target.value })} /></Field>
          <Field label="Fees % (default)"><input type="number" className={inputCls} value={s.feesPct} onChange={(e) => setS({ ...s, feesPct: Number(e.target.value) || 0 })} /></Field>
          <Field label="Tax mode (default)">
            <select className={inputCls} value={s.taxMode} onChange={(e) => setS({ ...s, taxMode: e.target.value as TaxMode })}>
              <option value="CGST_SGST">CGST + SGST</option>
              <option value="IGST">IGST</option>
              <option value="NONE">No tax</option>
            </select>
          </Field>
          <Field label="GST % (default, total)"><input type="number" className={inputCls} value={s.taxRate} onChange={(e) => setS({ ...s, taxRate: Number(e.target.value) || 0 })} /></Field>
          <Field label="UPI ID (for QR)"><input className={inputCls} value={s.business.upiId ?? ''} onChange={(e) => setBiz('upiId', e.target.value)} /></Field>
          <label className="flex items-end gap-2 pb-2 text-sm cursor-pointer">
            <input type="checkbox" checked={s.showUpiQr} onChange={(e) => setS({ ...s, showUpiQr: e.target.checked })} />
            Show UPI QR on invoice
          </label>
        </div>
      </Card>

      <Card title="Table columns (flexible — add/remove/formula)">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                <th className="py-1 pr-2">Label</th><th className="py-1 pr-2">Key</th><th className="py-1 pr-2">Width</th>
                <th className="py-1 pr-2">Type</th><th className="py-1 pr-2">Formula (optional)</th><th className="py-1 pr-2">Total?</th><th />
              </tr>
            </thead>
            <tbody>
              {s.columns.map((c, i) => (
                <tr key={i} className="border-b border-neutral-100 dark:border-neutral-800/60">
                  <td className="py-1 pr-2"><input className={inputCls + ' !py-1'} value={c.label} onChange={(e) => setCol(i, { label: e.target.value })} /></td>
                  <td className="py-1 pr-2"><input className={inputCls + ' !py-1 max-w-28'} value={c.key} onChange={(e) => setCol(i, { key: e.target.value.replace(/\W/g, '') })} /></td>
                  <td className="py-1 pr-2"><input type="number" className={inputCls + ' !py-1 max-w-16'} value={c.width} onChange={(e) => setCol(i, { width: Number(e.target.value) || 1 })} /></td>
                  <td className="py-1 pr-2">
                    <select className={inputCls + ' !py-1'} value={c.type} onChange={(e) => setCol(i, { type: e.target.value as ColumnDef['type'] })}>
                      <option value="text">text</option><option value="number">number</option><option value="date">date</option>
                    </select>
                  </td>
                  <td className="py-1 pr-2"><input className={inputCls + ' !py-1'} placeholder="e.g. ratePerDay * attend" value={c.formula ?? ''} onChange={(e) => setCol(i, { formula: e.target.value || undefined })} /></td>
                  <td className="py-1 pr-2 text-center"><input type="checkbox" checked={!!c.sumInTotal} onChange={(e) => setCol(i, { sumInTotal: e.target.checked })} /></td>
                  <td className="py-1"><button className="text-red-500 hover:underline cursor-pointer" onClick={() => setS({ ...s, columns: s.columns.filter((_, j) => j !== i) })}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className={btnGhost + ' mt-2'} onClick={() => setS({ ...s, columns: [...s.columns, { key: 'col' + (s.columns.length + 1), label: 'New Column', width: 6, type: 'number' }] })}>
          + Add column
        </button>
        <button className={btnGhost + ' mt-2 ml-2'} onClick={() => setS({ ...s, columns: defaultColumns })}>
          Reset columns to default
        </button>
        <div className="mt-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 p-3 text-xs text-neutral-600 dark:text-neutral-300 space-y-1">
          <div className="font-semibold">How formulas work</div>
          <div>Use column keys as variables with + - * / and parentheses. Available keys: <span className="font-mono">{s.columns.map((c) => c.key).join(', ')}</span></div>
          <div>Defaults: <span className="font-mono">ratePerDay = basicSalary / days</span> · <span className="font-mono">totalDays = attend + holidays</span> · <span className="font-mono">amount = ratePerDay * totalDays</span></div>
          <div>Columns with a formula are calculated automatically — they never appear as inputs on the New Invoice form. Adding or removing columns auto-adjusts the invoice layout (widths + font size).</div>
        </div>
      </Card>

      <Card title="GitHub sync (data private repo me save hota hai)">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Owner"><input className={inputCls} value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="angadseth" /></Field>
          <Field label="Data repo"><input className={inputCls} value={repoName} onChange={(e) => setRepoName(e.target.value)} placeholder="youthclub-data" /></Field>
          <Field label="Token (fine-grained PAT)"><input type="password" className={inputCls} value={token} onChange={(e) => setTok(e.target.value)} /></Field>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button className={btnPrimary} onClick={() => { setRepoConfig({ owner: owner.trim(), repo: repoName.trim(), branch: 'main' }); setToken(token); void flushQueue() }}>
            Connect / Save
          </button>
          <button className={btnGhost} disabled={pulling === 'busy'} onClick={async () => { setPulling('busy'); try { await pullAll(); setPulling('done') } catch { setPulling('fail') } }}>
            {pulling === 'busy' ? 'Loading…' : 'Pull from repo'}
          </button>
          <span className="text-xs font-medium">
            {sync.state === 'off' && <span className="text-neutral-400">Sync off — set a token</span>}
            {sync.state === 'synced' && <span className="text-green-600">All synced ✓</span>}
            {sync.state === 'pending' && <span className="text-amber-600">{sync.count} file(s) pending — will push when online</span>}
            {sync.state === 'error' && <span className="text-red-500">{sync.message}</span>}
          </span>
          {pulling === 'done' && <span className="text-xs text-green-600">Data loaded from repo ✓</span>}
          {pulling === 'fail' && <span className="text-xs text-red-500">Pull failed — check token/repo</span>}
        </div>
        <p className="mt-2 text-xs text-neutral-500">Pending: {pendingCount()} · Every save is a git commit — permanent history, nothing is ever lost.</p>
      </Card>

      <Card title="Backup">
        <div className="flex flex-wrap gap-2">
          <button className={btnGhost} onClick={() => download(new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' }), `youthclub-backup-${new Date().toISOString().slice(0, 10)}.json`)}>
            Download full backup (JSON)
          </button>
          <button className={btnGhost} onClick={() => backupInput.current?.click()}>Import backup</button>
          <input ref={backupInput} type="file" accept=".json" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0]
            if (!f) return
            const r = new FileReader()
            r.onload = () => { try { importBackup(JSON.parse(String(r.result))) } catch { alert('Invalid backup file') } }
            r.readAsText(f)
          }} />
        </div>
      </Card>
    </div>
  )
}
