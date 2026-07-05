/** Bridge to the Electron shell (exposed by electron/preload.cjs). Undefined on the web. */
export interface DesktopBridge {
  initialState: string | null
  saveState: (json: string) => Promise<void>
  saveFile: (filename: string, buffer: ArrayBuffer) => Promise<string>
  openDataFolder: () => Promise<void>
}

export const desktop: DesktopBridge | undefined =
  typeof window !== 'undefined' ? (window as { desktop?: DesktopBridge }).desktop : undefined
