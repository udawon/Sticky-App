"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Star, TrendingUp, Target, Award, Calendar } from "lucide-react"
import { toast } from "sonner"
import { MiniAvatar, PartIcon } from "@/components/avatar/mini-avatar"
import type { PointLog, Task, ShopItem, Profile } from "@/types/database"

type AvatarSlotKey = "hair" | "face" | "top" | "bottom" | "shoes"
const AVATAR_SLOTS: { key: AvatarSlotKey; label: string }[] = [
  { key: "hair",   label: "머리" },
  { key: "face",   label: "얼굴" },
  { key: "top",    label: "상의" },
  { key: "bottom", label: "하의" },
  { key: "shoes",  label: "신발" },
]

function getLevel(totalPoints: number) {
  const levels = [
    { level: 1, name: "새싹", min: 0, max: 100 },
    { level: 2, name: "묘목", min: 100, max: 300 },
    { level: 3, name: "나무", min: 300, max: 600 },
    { level: 4, name: "숲", min: 600, max: 1000 },
    { level: 5, name: "산", min: 1000, max: 2000 },
    { level: 6, name: "전설", min: 2000, max: Infinity },
  ]
  const current = levels.find(l => totalPoints >= l.min && totalPoints < l.max) ?? levels[levels.length - 1]
  const progress = current.max === Infinity ? 100 : ((totalPoints - current.min) / (current.max - current.min)) * 100
  return { ...current, progress }
}

const LEVEL_EMOJI: Record<number, string> = {
  1: "🌱", 2: "🌿", 3: "🌳", 4: "🌲", 5: "⛰️", 6: "🏔️",
}

export function CompactMypagePanel() {
  const { user, refreshProfile, setUser } = useAuthStore()
  const [pointLogs, setPointLogs] = useState<PointLog[]>([])
  const [recentTasks, setRecentTasks] = useState<Task[]>([])
  const [partItems, setPartItems] = useState<ShopItem[]>([])
  const [ownedPartIds, setOwnedPartIds] = useState<Set<string>>(new Set())
  const [openSlot, setOpenSlot] = useState<AvatarSlotKey | null>(null)

  useEffect(() => {
    if (!user) return
    refreshProfile()
    loadData()
    loadPartsData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const loadData = async () => {
    if (!user) return
    const supabase = createClient()
    const [pointResult, taskResult] = await Promise.all([
      supabase.from("point_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(15),
      supabase.from("tasks").select("*").contains("assigned_to", [user.id]).eq("status", "done").order("completed_at", { ascending: false }).limit(8),
    ])
    if (pointResult.data) setPointLogs(pointResult.data as PointLog[])
    if (taskResult.data) setRecentTasks(taskResult.data as Task[])
  }

  const loadPartsData = async () => {
    if (!user) return
    const supabase = createClient()
    const [itemsResult, purchasesResult] = await Promise.all([
      supabase.from("shop_items").select("*").in("category", ["hair", "face", "top", "bottom", "shoes"]).order("price"),
      supabase.from("purchases").select("item_id").eq("user_id", user.id),
    ])
    if (itemsResult.data) setPartItems(itemsResult.data as ShopItem[])
    if (purchasesResult.data) setOwnedPartIds(new Set(purchasesResult.data.map(p => p.item_id)))
  }

  const handleEquip = async (slot: AvatarSlotKey, imageKey: string) => {
    if (!user) return
    const item = partItems.find(i => i.image_key === imageKey)

    // 0P 아이템이고 구매 기록 없으면 자동 구매 처리
    if (item && item.price === 0 && !ownedPartIds.has(item.id)) {
      const supabase = createClient()
      await supabase.from("purchases").insert({ user_id: user.id, item_id: item.id })
      setOwnedPartIds(prev => new Set([...prev, item.id]))
    }

    const supabase = createClient()
    await supabase.from("profiles").update({ [`avatar_${slot}`]: imageKey }).eq("id", user.id)
    setUser({ ...user, [`avatar_${slot}`]: imageKey } as Profile)
    setOpenSlot(null)
    toast.success(`${item?.name ?? imageKey} 장착 완료!`)
  }

  if (!user) return null
  const level = getLevel(user.total_points_earned)

  // 장착된 파츠 image_key 가져오기 (필드가 없으면 기본값)
  const equippedKey = (slot: AvatarSlotKey) =>
    (user[`avatar_${slot}` as keyof Profile] as string | undefined) ?? `${slot}_default`

  return (
    <div className="p-3 space-y-3">
      {/* 프로필 헤더 */}
      <div className="rounded-lg bg-gradient-to-r from-primary/20 via-primary/10 to-transparent p-3">
        <div className="flex items-center gap-3">
          {/* 아바타 미리보기 (전체 픽셀아트) */}
          <div className="relative flex-shrink-0">
            <div className="rounded-full border-2 border-primary/30 overflow-hidden bg-muted/30">
              <MiniAvatar
                hairKey={equippedKey("hair")}
                faceKey={equippedKey("face")}
                topKey={equippedKey("top")}
                bottomKey={equippedKey("bottom")}
                shoesKey={equippedKey("shoes")}
                size={52}
              />
            </div>
            <span className="absolute -bottom-1 -right-1 text-sm">{LEVEL_EMOJI[level.level] ?? "🌱"}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-sm font-bold truncate">{user.nickname}</p>
              <Badge variant={user.role === "admin" ? "default" : "secondary"} className="text-[10px] px-1 py-0 h-4">
                {user.role === "admin" ? "리더" : "팀원"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            <div className="mt-1.5 space-y-0.5">
              <div className="flex justify-between text-[10px]">
                <span>Lv.{level.level} {level.name}</span>
                {level.max !== Infinity && (
                  <span className="text-muted-foreground">{user.total_points_earned}/{level.max}</span>
                )}
              </div>
              <Progress value={level.progress} className="h-1.5" />
            </div>
          </div>
        </div>
      </div>

      {/* 통계 2x2 그리드 */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: Star, color: "text-amber-600", bg: "bg-amber-50", label: "보유 포인트", value: `${user.points}P` },
          { icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50", label: "누적 포인트", value: `${user.total_points_earned}P` },
          { icon: Target, color: "text-green-600", bg: "bg-green-50", label: "완료 과제", value: `${user.tasks_completed}건` },
          { icon: Award, color: "text-purple-600", bg: "bg-purple-50", label: "레벨", value: `Lv.${level.level}` },
        ].map(({ icon: Icon, color, bg, label, value }) => (
          <div key={label} className="flex items-center gap-2 rounded-lg border p-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${bg}`}>
              <Icon className={`h-3.5 w-3.5 ${color}`} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">{label}</p>
              <p className="text-xs font-bold">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 내 파츠 슬롯 */}
      <div>
        <p className="mb-1.5 text-xs font-semibold">내 아바타 파츠</p>
        <div className="space-y-1.5">
          {AVATAR_SLOTS.map(({ key, label }) => {
            const currentKey = equippedKey(key)
            const currentItem = partItems.find(i => i.image_key === currentKey)
            const ownedSlotItems = partItems.filter(
              i => i.category === key && (ownedPartIds.has(i.id) || i.price === 0)
            )
            return (
              <div key={key} className="flex items-center gap-2 rounded-lg border px-2 py-1.5">
                <div className="flex-shrink-0">
                  <PartIcon slot={key} imageKey={currentKey} size={28} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className="text-xs font-medium truncate">{currentItem?.name ?? "기본"}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[10px] px-2 flex-shrink-0"
                  disabled={ownedSlotItems.length === 0}
                  onClick={() => setOpenSlot(key)}
                >
                  변경
                </Button>
              </div>
            )
          })}
        </div>
      </div>

      {/* 파츠 변경 Dialog */}
      {openSlot && (
        <Dialog open={!!openSlot} onOpenChange={() => setOpenSlot(null)}>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle className="text-sm">
                {AVATAR_SLOTS.find(s => s.key === openSlot)?.label} 파츠 변경
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-2">
              {partItems
                .filter(i => i.category === openSlot && (ownedPartIds.has(i.id) || i.price === 0))
                .map(item => {
                  const isEquipped = item.image_key === equippedKey(openSlot)
                  return (
                    <button
                      key={item.id}
                      className={`rounded-lg border p-2 text-center transition-colors ${
                        isEquipped ? "border-primary bg-primary/10" : "hover:bg-accent border-transparent"
                      }`}
                      onClick={() => handleEquip(openSlot, item.image_key)}
                    >
                      <div className="mx-auto mb-1 flex items-center justify-center">
                        <PartIcon slot={openSlot} imageKey={item.image_key} size={40} />
                      </div>
                      <p className="text-[10px] leading-tight">{item.name}</p>
                      {isEquipped && (
                        <p className="mt-0.5 text-[9px] text-primary font-semibold">착용중</p>
                      )}
                    </button>
                  )
                })}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 포인트 내역 */}
      <div>
        <p className="mb-1.5 text-xs font-semibold">포인트 내역</p>
        <ScrollArea className="h-[100px]">
          {pointLogs.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">내역 없음</p>
          ) : (
            <div className="space-y-1">
              {pointLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between rounded border px-2 py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs truncate">{log.reason}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(log.created_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <span className={`text-xs font-bold ${log.amount > 0 ? "text-green-600" : "text-red-500"}`}>
                    {log.amount > 0 ? "+" : ""}{log.amount}P
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* 완료 과제 */}
      <div>
        <p className="mb-1.5 text-xs font-semibold">완료한 과제</p>
        <ScrollArea className="h-[80px]">
          {recentTasks.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">없음</p>
          ) : (
            <div className="space-y-1">
              {recentTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between rounded border px-2 py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs truncate">{task.title}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Calendar className="h-2.5 w-2.5" />
                      {task.completed_at ? new Date(task.completed_at).toLocaleDateString("ko-KR") : "-"}
                    </p>
                  </div>
                  {task.points > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1 h-4">+{task.points}P</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}
