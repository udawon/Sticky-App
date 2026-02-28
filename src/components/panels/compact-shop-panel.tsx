"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Star, Check } from "lucide-react"
import { toast } from "sonner"
import { PartIcon } from "@/components/avatar/mini-avatar"
import type { ShopItem, Purchase, Profile } from "@/types/database"

const SLOT_TABS = [
  { key: "hair",   label: "머리" },
  { key: "face",   label: "얼굴" },
  { key: "top",    label: "상의" },
  { key: "bottom", label: "하의" },
  { key: "shoes",  label: "신발" },
] as const

export function CompactShopPanel() {
  const { user, setUser } = useAuthStore()
  const [items, setItems] = useState<ShopItem[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null)

  useEffect(() => {
    const syncProfile = async () => {
      if (!user) return
      const supabase = createClient()
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      if (data) setUser(data as Profile)
    }
    syncProfile()
    loadShopData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const loadShopData = async () => {
    if (!user) return
    const supabase = createClient()
    const { data: shopItems } = await supabase
      .from("shop_items")
      .select("*")
      .in("category", ["hair", "face", "top", "bottom", "shoes"])
      .order("price", { ascending: true })
    if (shopItems) setItems(shopItems as ShopItem[])

    const { data: userPurchases } = await supabase
      .from("purchases").select("*").eq("user_id", user.id)
    if (userPurchases) setPurchases(userPurchases as Purchase[])
  }

  const handlePurchase = async (item: ShopItem) => {
    if (!user) return
    if (user.points < item.price) {
      toast.error("포인트 부족!", { description: `필요: ${item.price}P / 보유: ${user.points}P` })
      return
    }
    setIsPurchasing(item.id)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("purchases").insert({ user_id: user.id, item_id: item.id })
      if (error) throw error

      const newPoints = user.points - item.price
      await supabase.from("profiles").update({ points: newPoints }).eq("id", user.id)
      if (item.price > 0) {
        await supabase.from("point_logs").insert({
          user_id: user.id, amount: -item.price, reason: `상점 구매: ${item.name}`,
        })
      }

      setUser({ ...user, points: newPoints })
      setPurchases(prev => [...prev, {
        id: crypto.randomUUID(), user_id: user.id, item_id: item.id,
        purchased_at: new Date().toISOString(),
      }])
      toast.success(`${item.name} ${item.price === 0 ? "획득" : "구매"} 완료!`)
    } catch {
      toast.error("구매에 실패했습니다.")
    } finally {
      setIsPurchasing(null)
    }
  }

  const isOwned = (itemId: string) => purchases.some(p => p.item_id === itemId)

  return (
    <div className="p-3 space-y-3">
      {/* 헤더: 자판기 타이틀 + 보유 포인트 */}
      <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2">
        <span className="text-sm font-bold">🎰 자판기</span>
        <span className="flex items-center gap-1 text-sm font-semibold text-primary">
          <Star className="h-3.5 w-3.5" />
          {user?.points ?? 0}P
        </span>
      </div>

      {/* 5개 탭 */}
      <Tabs defaultValue="hair">
        <TabsList className="grid w-full grid-cols-5 h-7">
          {SLOT_TABS.map(tab => (
            <TabsTrigger key={tab.key} value={tab.key} className="text-[10px] h-6 px-1">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {SLOT_TABS.map(tab => (
          <TabsContent key={tab.key} value={tab.key} className="mt-2">
            <div className="grid grid-cols-2 gap-2">
              {items
                .filter(i => i.category === tab.key)
                .map(item => (
                  <PartItemCard
                    key={item.id}
                    item={item}
                    owned={isOwned(item.id)}
                    isPurchasing={isPurchasing === item.id}
                    onPurchase={handlePurchase}
                  />
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

function PartItemCard({
  item, owned, isPurchasing, onPurchase,
}: {
  item: ShopItem
  owned: boolean
  isPurchasing: boolean
  onPurchase: (item: ShopItem) => void
}) {
  const slot = item.category as "hair" | "face" | "top" | "bottom" | "shoes"

  return (
    <div className={`rounded-lg border p-2 ${owned ? "border-primary/30 bg-primary/5" : "hover:bg-accent/50"}`}>
      {/* 파츠 미리보기 캔버스 */}
      <div className="mb-1 flex items-center justify-center">
        <PartIcon slot={slot} imageKey={item.image_key} size={44} />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-1">
          <p className="text-xs font-medium truncate">{item.name}</p>
          {owned && <Check className="h-3 w-3 flex-shrink-0 text-primary" />}
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
            <Star className="h-3 w-3 text-amber-500" />
            {item.price === 0 ? "무료" : `${item.price}P`}
          </span>
          {owned ? (
            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">보유</Badge>
          ) : (
            <Button
              size="sm"
              className="h-5 text-[10px] px-2"
              onClick={() => onPurchase(item)}
              disabled={isPurchasing}
            >
              {item.price === 0 ? "받기" : "구매"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
