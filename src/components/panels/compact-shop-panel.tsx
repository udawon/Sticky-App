"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Star, Check, Sparkles, ShoppingBag } from "lucide-react"
import { toast } from "sonner"
import type { ShopItem, Purchase, Profile } from "@/types/database"

const DEFAULT_ITEMS: Omit<ShopItem, "id" | "created_at">[] = [
  { name: "기본 아바타", description: "기본 캐릭터 스킨", category: "body", image_key: "avatar_default", price: 0 },
  { name: "블루 아바타", description: "시원한 블루 스킨", category: "body", image_key: "avatar_blue", price: 50 },
  { name: "레드 아바타", description: "열정의 레드 스킨", category: "body", image_key: "avatar_red", price: 50 },
  { name: "골드 아바타", description: "프리미엄 골드 스킨", category: "body", image_key: "avatar_gold", price: 200 },
  { name: "왕관", description: "최고 리더를 위한 왕관", category: "accessory", image_key: "acc_crown", price: 150 },
  { name: "선글라스", description: "멋진 선글라스", category: "accessory", image_key: "acc_sunglasses", price: 30 },
  { name: "고양이 귀", description: "귀여운 고양이 귀", category: "accessory", image_key: "acc_cat_ears", price: 80 },
  { name: "별 이펙트", description: "반짝이는 별 이펙트", category: "accessory", image_key: "acc_stars", price: 100 },
]

const ITEM_COLORS: Record<string, string> = {
  avatar_default: "bg-gray-200", avatar_blue: "bg-blue-400",
  avatar_red: "bg-red-400", avatar_gold: "bg-amber-400",
  acc_crown: "bg-amber-300", acc_sunglasses: "bg-gray-600",
  acc_cat_ears: "bg-pink-300", acc_stars: "bg-purple-300",
}

const ITEM_EMOJI: Record<string, string> = {
  avatar_default: "🧑", avatar_blue: "🧊", avatar_red: "🔥", avatar_gold: "✨",
  acc_crown: "👑", acc_sunglasses: "🕶️", acc_cat_ears: "🐱", acc_stars: "⭐",
}

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
    const supabase = createClient()
    const { data: shopItems } = await supabase.from("shop_items").select("*").order("price", { ascending: true })

    if (shopItems && shopItems.length > 0) {
      setItems(shopItems as ShopItem[])
    } else {
      setItems(DEFAULT_ITEMS.map((item, i) => ({ ...item, id: `default-${i}`, created_at: new Date().toISOString() })))
    }

    if (user) {
      const { data: userPurchases } = await supabase.from("purchases").select("*").eq("user_id", user.id)
      if (userPurchases) setPurchases(userPurchases as Purchase[])
    }
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
      await supabase.from("point_logs").insert({ user_id: user.id, amount: -item.price, reason: `상점 구매: ${item.name}` })

      setUser({ ...user, points: newPoints })
      setPurchases((prev) => [...prev, { id: crypto.randomUUID(), user_id: user.id, item_id: item.id, purchased_at: new Date().toISOString() }])
      toast.success(`${item.name} 구매 완료!`)
    } catch {
      toast.error("구매에 실패했습니다.")
    } finally {
      setIsPurchasing(null)
    }
  }

  const isOwned = (itemId: string) => purchases.some((p) => p.item_id === itemId)
  const bodyItems = items.filter((i) => i.category === "body")
  const accessoryItems = items.filter((i) => i.category === "accessory")

  return (
    <div className="p-3 space-y-3">
      {/* 보유 포인트 */}
      <div className="flex items-center justify-center gap-1 rounded-lg bg-primary/10 py-1.5">
        <Star className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-primary">{user?.points ?? 0}P</span>
      </div>

      <Tabs defaultValue="body">
        <TabsList className="w-full h-7">
          <TabsTrigger value="body" className="flex-1 text-xs h-6">
            <Sparkles className="mr-1 h-3 w-3" />아바타
          </TabsTrigger>
          <TabsTrigger value="accessory" className="flex-1 text-xs h-6">
            <ShoppingBag className="mr-1 h-3 w-3" />악세서리
          </TabsTrigger>
        </TabsList>

        <TabsContent value="body" className="mt-2">
          <div className="grid grid-cols-2 gap-2">
            {bodyItems.map((item) => (
              <ShopItemCompact
                key={item.id}
                item={item}
                owned={isOwned(item.id)}
                isPurchasing={isPurchasing === item.id}
                onPurchase={handlePurchase}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="accessory" className="mt-2">
          <div className="grid grid-cols-2 gap-2">
            {accessoryItems.map((item) => (
              <ShopItemCompact
                key={item.id}
                item={item}
                owned={isOwned(item.id)}
                isPurchasing={isPurchasing === item.id}
                onPurchase={handlePurchase}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ShopItemCompact({
  item, owned, isPurchasing, onPurchase,
}: {
  item: ShopItem; owned: boolean; isPurchasing: boolean; onPurchase: (item: ShopItem) => void
}) {
  return (
    <div className={`rounded-lg border p-2 ${owned ? "border-primary/30 bg-primary/5" : "hover:bg-accent/50"}`}>
      <div className={`mb-2 flex h-14 items-center justify-center rounded ${ITEM_COLORS[item.image_key] ?? "bg-muted"}`}>
        <span className="text-2xl">{ITEM_EMOJI[item.image_key] ?? "🎁"}</span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium truncate">{item.name}</p>
          {owned && <Check className="h-3 w-3 text-primary" />}
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-0.5 text-xs">
            <Star className="h-3 w-3 text-amber-500" />
            {item.price === 0 ? "무료" : `${item.price}P`}
          </span>
          {!owned && (
            <Button size="sm" className="h-5 text-[10px] px-2" onClick={() => onPurchase(item)} disabled={isPurchasing}>
              구매
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
