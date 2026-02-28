"use client"

import { useEffect, useRef, useState } from "react"
import { useTaskStore, type SortBy } from "@/stores/task-store"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, X } from "lucide-react"

export function TaskFilterBar() {
  const { sortBy, searchQuery, setSortBy, setSearchQuery } = useTaskStore()

  // 로컬 검색어 상태 (디바운스용)
  const [localSearch, setLocalSearch] = useState(searchQuery)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearchQuery(localSearch)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [localSearch, setSearchQuery])

  const handleClearSearch = () => {
    setLocalSearch("")
    setSearchQuery("")
  }

  return (
    <div className="flex items-center gap-2">
      {/* 검색 */}
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/60" />
        <Input
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="과제 검색..."
          className="h-7 pl-7 pr-6 text-xs bg-muted/50 border-transparent focus:border-border focus:bg-background rounded-lg transition-colors"
          autoComplete="off"
        />
        {localSearch && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* 정렬 */}
      <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
        <SelectTrigger className="h-7 w-[76px] text-[11px] px-2 bg-muted/50 border-transparent hover:border-border rounded-lg transition-colors">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="created_at">최신순</SelectItem>
          <SelectItem value="due_date">마감일</SelectItem>
          <SelectItem value="priority">우선순위</SelectItem>
          <SelectItem value="points">포인트</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
