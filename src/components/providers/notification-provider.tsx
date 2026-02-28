"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuthStore } from "@/stores/auth-store"
import { useNotificationStore } from "@/stores/notification-store"
import type { Notification } from "@/types/database"

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  const { addNotification, setNotifications, unreadCount } = useNotificationStore()
  const lastCheckedRef = useRef<string>(new Date().toISOString())
  const knownIdsRef = useRef<Set<string>>(new Set())

  // 초기 알람 로드 (최근 30개)
  useEffect(() => {
    if (!user) return

    const supabase = createClient()
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (data) {
          setNotifications(data as Notification[])
          // 기존 알림 ID 기록 (폴링 중복 방지)
          data.forEach((n) => knownIdsRef.current.add(n.id))
          // 폴링 기준 시각 = 가장 최근 알림 시각
          if (data.length > 0) lastCheckedRef.current = data[0].created_at
        }
      })
  }, [user?.id, setNotifications])

  // Realtime 구독 + 폴링 fallback
  useEffect(() => {
    if (!user) return

    const supabase = createClient()

    // createBrowserClient의 내부 세션이 비어있을 수 있어 Realtime WebSocket이
    // anon JWT로 연결됨 → RLS auth.uid() = NULL → 이벤트 차단
    // 쿠키에서 access_token을 직접 읽어 Realtime에 주입
    const authCookie = document.cookie.split(';').find((c) =>
      c.trim().match(/^sb-[^=]+-auth-token=/)
    )
    if (authCookie) {
      const raw = authCookie.split('=').slice(1).join('=').trim()
      const b64 = raw.startsWith('base64-') ? raw.slice(7) : raw
      try {
        const session = JSON.parse(atob(b64))
        if (session.access_token) {
          supabase.realtime.setAuth(session.access_token)
          console.log("[Realtime] access_token 주입 완료")
        }
      } catch { /* 파싱 실패 시 무시 */ }
    }

    // filter 포함 구독 — Supabase RLS 정책 + filter 일치 필요
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as Notification
          if (knownIdsRef.current.has(n.id)) return  // 중복 방지
          knownIdsRef.current.add(n.id)
          lastCheckedRef.current = n.created_at
          addNotification(n)
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[Realtime] 알림 구독 연결됨")
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(`[Realtime] 알림 구독 실패 (${status}) — 폴링 폴백으로 동작`)
        }
      })

    // 30초 폴링 fallback — Realtime 실패 시 새 알림 누락 방지
    const timer = setInterval(async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .gt("created_at", lastCheckedRef.current)
        .order("created_at", { ascending: true })

      if (!data || data.length === 0) return
      data.forEach((n) => {
        if (knownIdsRef.current.has(n.id)) return
        knownIdsRef.current.add(n.id)
        addNotification(n as Notification)
      })
      lastCheckedRef.current = data[data.length - 1].created_at
    }, 30_000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(timer)
    }
  }, [user?.id, addNotification])

  // unreadCount 변화 → Electron 트레이 뱃지 동기화
  useEffect(() => {
    window.electronAPI?.setBadge(unreadCount)
  }, [unreadCount])

  return <>{children}</>
}
