import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'dark', // 'dark' | 'light'
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
    }),
    { name: 'market-watch-theme' }
  )
)

export const useSettingsStore = create(
  persist(
    (set) => ({
      isSettingsOpen: false,
      toggleSettingsModal: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
      overlays: {
        ma: true,
        bb: false,
        sar: false,
        vwap: false,
        kc: false,
        lr: false,
        ich: false,
        fib: false,
        pp: false
      },
      aiSettings: {
        provider: 'openai',
        apiKey: ''
      },
      setAiSettings: (settings) => set((state) => ({ aiSettings: { ...state.aiSettings, ...settings } })),
      toggleOverlay: (key) => set((state) => ({
        overlays: { ...state.overlays, [key]: !state.overlays[key] }
      })),
    }),
    { 
      name: 'market-watch-settings',
      partialize: (state) => ({ overlays: state.overlays, aiSettings: state.aiSettings }) // 只持久化這些
    }
  )
)

export const useLayoutStore = create((set) => ({
  focusedColumn: null, // null | 'A' | 'B' | 'C'
  setFocusedColumn: (col) => set({ focusedColumn: col }),
}))
