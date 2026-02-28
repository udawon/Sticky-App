"use client"

import { useEffect } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { useNotificationStore } from "@/stores/notification-store"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, CheckCheck } from "lucide-react"
import type { Notification } from "@/types/database"

export function CompactNotificationsPanel() {
  const { user } = useAuthStore()
  const { notifications, unreadCount, setNotifications, markAsRead, markAllAsRead } = useNotificationStore()

  useEffect(() => {
    if (!user) return
    const loadNotifications = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20)
      if (data) setNotifications(data as Notification[])
    }
    loadNotifications()
  }, [user?.id, setNotifications])

  const handleMarkAsRead = async (id: string) => {
    const supabase = createClient()
    await supabase.from("notifications").update({ read: true }).eq("id", id)
    markAsRead(id)
  }

  const handleMarkAllAsRead = async () => {
    if (!user) return
    const supabase = createClient()
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false)
    markAllAsRead()
  }

  return (
    <div className="p-3 space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Bell className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold">알림</span>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
              {unreadCount}
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={handleMarkAllAsRead}>
            <CheckCheck className="mr-1 h-3 w-3" />
            모두 읽음
          </Button>
        )}
      </div>

      {/* 알림 목록 */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Bell className="mb-2 h-8 w-8 opacity-30" />
          <p className="text-xs">알림이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-lg border p-2 cursor-pointer transition-colors ${
                notification.read ? "opacity-60" : "bg-primary/5 border-primary/20"
              }`}
              onClick={() => !notification.read && handleMarkAsRead(notification.id)}
            >
              <div className="flex items-start justify-between gap-1">
                <p className="text-xs font-medium">{notification.title}</p>
                {!notification.read && (
                  <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                )}
              </div>
              <p className="text-[10px] text-muted-foreground line-clamp-2">
                {notification.message}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {new Date(notification.created_at).toLocaleDateString("ko-KR")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
