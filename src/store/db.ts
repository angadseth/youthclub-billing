import { useSyncExternalStore } from 'react'
import type { Invoice, Party, Settings } from '../domain/types'
import { defaultColumns, defaultSettings, seedClients } from './seed'
import { desktop } from './desktop'
import { enqueue, getFile, listDir } from './github'

export interface AppState {
  settings: Settings
  clients: Party[]
  invoices: Invoice[] // all invoices, all clients
}

const STATE_KEY = 'ycb_state'

function load(): AppState {
  try {
    // desktop app: the data.json file in Documents\YouthClub Billing is the source of truth
    const raw = desktop?.initialState ?? localStorage.getItem(STATE_KEY)
    if (raw) {
      const s = JSON.parse(raw) as AppState
      // migrate: old default column set (pre attendance-formula chain) → new defaults
      const amount = s.settings?.columns?.find((c) => c.key === 'amount')
      if (amount?.formula === 'ratePerDay * attend') s.settings.columns = defaultColumns
      // tolerate older saves missing newer settings fields
      return { ...s, settings: { ...defaultSettings, ...s.settings, business: { ...defaultSettings.business, ...s.settings.business } } }
    }
  } catch {
    /* corrupted → reseed */
  }
  return { settings: defaultSettings, clients: seedClients, invoices: [] }
}

let state: AppState = load()
const listeners = new Set<() => void>()

function persist() {
  const json = JSON.stringify(state)
  localStorage.setItem(STATE_KEY, json)
  desktop?.saveState(json)
  listeners.forEach((fn) => fn())
}

export function getState(): AppState {
  return state
}

export function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}

export function useDB(): AppState {
  return useSyncExternalStore(subscribe, getState)
}

export function saveSettings(settings: Settings) {
  state = { ...state, settings }
  persist()
  enqueue('settings.json', settings, 'Update settings')
}

export function saveClient(client: Party) {
  const others = state.clients.filter((c) => c.id !== client.id)
  state = { ...state, clients: [...others, client].sort((a, b) => a.name.localeCompare(b.name)) }
  persist()
  enqueue(`clients/${client.id}/client.json`, client, `Update client ${client.name}`)
}

export function deleteClient(id: string) {
  state = { ...state, clients: state.clients.filter((c) => c.id !== id) }
  persist()
}

export function saveInvoice(invIn: Invoice) {
  const inv = { ...invIn, updatedAt: new Date().toISOString() }
  const others = state.invoices.filter((i) => i.id !== inv.id)
  state = { ...state, invoices: [...others, inv].sort((a, b) => a.no.localeCompare(b.no)) }
  persist()
  const period = inv.periodTo.slice(0, 7) || inv.date.slice(0, 7)
  enqueue(`clients/${inv.clientId}/invoices/${period}.json`, inv, `Invoice ${inv.no}`)
}

export function deleteInvoice(id: string) {
  state = { ...state, invoices: state.invoices.filter((i) => i.id !== id) }
  persist()
}

export function importBackup(data: AppState) {
  state = data
  persist()
}

/** Pull everything from the data repo (used on startup + "Sync now"). */
export async function pullAll(): Promise<void> {
  const settingsFile = await getFile('settings.json')
  const clients: Party[] = []
  const invoices: Invoice[] = []
  const clientDirs = await listDir('clients')
  for (const d of clientDirs.filter((x) => x.type === 'dir')) {
    const cf = await getFile(`clients/${d.name}/client.json`)
    if (cf) clients.push(cf.json as Party)
    const invFiles = await listDir(`clients/${d.name}/invoices`)
    for (const f of invFiles.filter((x) => x.name.endsWith('.json'))) {
      const inv = await getFile(f.path)
      if (inv) invoices.push(inv.json as Invoice)
    }
  }
  state = {
    settings: settingsFile ? (settingsFile.json as Settings) : state.settings,
    clients: clients.length ? clients : state.clients,
    invoices: invoices.length ? invoices : state.invoices,
  }
  persist()
}
