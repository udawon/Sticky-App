import { create } from "zustand"
import { persist } from "zustand/middleware"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/types/database"

interface AuthState {
  user: Profile | null
  isLoading: boolean
  lastFetchedAt: number | null
  setUser: (user: Profile | null) => void
  setLoading: (loading: boolean) => void
  refreshProfile: () => Promise<void>
}

// 캐시 TTL: 5분
const CACHE_TTL_MS = 5 * 60 * 1000

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      lastFetchedAt: null,
      setUser: (user) => set({ user, lastFetchedAt: user ? Date.now() : null }),
      setLoading: (isLoading) => set({ isLoading }),
      refreshProfile: async () => {
        const { user } = get()
        if (!user) return

        const supabase = createClient()
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        if (!error && data) {
          set({ user: data as Profile, lastFetchedAt: Date.now() })
        }
      },
    }),
    {
      name: "auth-storage",
      storage: {
        getItem: (name) => {
          const str = sessionStorage.getItem(name)
          return str ? JSON.parse(str) : null
        },
        setItem: (name, value) => {
          sessionStorage.setItem(name, JSON.stringify(value))
        },
        removeItem: (name) => {
          sessionStorage.removeItem(name)
        },
      },
      // isLoading은 저장하지 않음
      partialize: (state) =>
        ({ user: state.user, lastFetchedAt: state.lastFetchedAt }) as AuthState,
      onRehydrateStorage: () => (state) => {
        // 캐시에서 복원 완료 시 즉시 로딩 해제
        if (state?.user) {
          state.isLoading = false
        }
      },
    }
  )
)

// 캐시 유효성 확인 헬퍼
export function isCacheValid(): boolean {
  const { lastFetchedAt } = useAuthStore.getState()
  if (!lastFetchedAt) return false
  return Date.now() - lastFetchedAt < CACHE_TTL_MS
}
