import { create } from "zustand"

// 패널 타입 정의
export type PanelType =
  | "tasks"
  | "league"
  | "shop"
  | "mypage"
  | "settings"
  | "admin"
  | "notifications"
  | "roulette"

interface PanelState {
  activePanel: PanelType | null
  openPanel: (panel: PanelType) => void
  closePanel: () => void
}

export const usePanelStore = create<PanelState>((set) => ({
  activePanel: null,
  openPanel: (panel) => set({ activePanel: panel }),
  closePanel: () => set({ activePanel: null }),
}))
