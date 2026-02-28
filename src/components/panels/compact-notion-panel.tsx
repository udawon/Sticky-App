"use client"

import { useState, useEffect } from "react"
import { useAuthStore } from "@/stores/auth-store"
import { useTaskStore } from "@/stores/task-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CheckCircle2,
  Circle,
  Download,
  Upload,
  Loader2,
  Search,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import type { NotionPreviewTask } from "@/types/notion"
import type { Task } from "@/types/database"

// ────────────────────────────────────────────
// Import 탭
// ────────────────────────────────────────────

type ImportStep = "input" | "preview" | "done"

function ImportTab() {
  const [step, setStep] = useState<ImportStep>("input")
  const [databaseId, setDatabaseId] = useState("")
  const [previews, setPreviews] = useState<NotionPreviewTask[]>([])
  const [importResult, setImportResult] = useState<{
    imported: number
    skipped: number
    errors: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  /** 데이터베이스 ID에서 UUID 부분 추출 */
  const parseDatabaseId = (input: string): string => {
    const match = input.match(
      /([0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12})/i
    )
    return match ? match[1] : input.trim()
  }

  const handlePreview = async () => {
    const dbId = parseDatabaseId(databaseId)
    if (!dbId) {
      toast.error("Notion 데이터베이스 ID를 입력하세요.")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/notion/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId: dbId, preview: true }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? "미리보기 조회에 실패했습니다.")
        return
      }

      setPreviews(data.tasks ?? [])
      setStep("preview")
    } catch {
      toast.error("네트워크 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleImport = async () => {
    const dbId = parseDatabaseId(databaseId)
    setIsLoading(true)
    try {
      const res = await fetch("/api/notion/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId: dbId, preview: false }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? "가져오기에 실패했습니다.")
        return
      }

      setImportResult(data.result)
      setStep("done")
      toast.success(`${data.result.imported}개 과제를 가져왔습니다.`)
    } catch {
      toast.error("네트워크 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setStep("input")
    setDatabaseId("")
    setPreviews([])
    setImportResult(null)
  }

  const newCount = previews.filter((p) => !p.already_imported).length
  const skipCount = previews.filter((p) => p.already_imported).length

  return (
    <div className="space-y-3">
      {/* 단계 표시 */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={step === "input" ? "text-foreground font-medium" : ""}>1. DB 입력</span>
        <span>/</span>
        <span className={step === "preview" ? "text-foreground font-medium" : ""}>2. 미리보기</span>
        <span>/</span>
        <span className={step === "done" ? "text-foreground font-medium" : ""}>3. 완료</span>
      </div>

      <Separator />

      {/* Step 1: DB ID 입력 */}
      {step === "input" && (
        <div className="space-y-3">
          <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Notion 연동 방법</p>
            <p>1. Notion에서 데이터베이스를 엽니다</p>
            <p>2. 우측 상단 ··· → 연결 → Claude Sticky 추가</p>
            <p>3. URL의 DB ID 또는 전체 URL을 입력하세요</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notion DB ID 또는 URL</Label>
            <Input
              value={databaseId}
              onChange={(e) => setDatabaseId(e.target.value)}
              placeholder="https://notion.so/... 또는 UUID"
              className="text-xs h-8"
              autoComplete="off"
            />
          </div>
          <Button
            size="sm"
            className="w-full h-8 text-xs"
            onClick={handlePreview}
            disabled={isLoading || !databaseId.trim()}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            ) : (
              <Search className="mr-2 h-3 w-3" />
            )}
            미리보기
          </Button>
        </div>
      )}

      {/* Step 2: 미리보기 */}
      {step === "preview" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              총 {previews.length}개 (신규 {newCount}, 중복 {skipCount})
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={handleReset}
            >
              다시 입력
            </Button>
          </div>

          <ScrollArea className="h-[240px]">
            <div className="space-y-1.5 pr-2">
              {previews.map((task) => (
                <div
                  key={task.notion_id}
                  className={`flex items-start gap-2 rounded-lg border p-2 ${
                    task.already_imported ? "opacity-50" : ""
                  }`}
                >
                  {task.already_imported ? (
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{task.title}</p>
                    {task.due_date && (
                      <p className="text-[10px] text-muted-foreground">
                        마감: {new Date(task.due_date).toLocaleDateString("ko-KR")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                      {task.priority === "high" ? "높음" : task.priority === "low" ? "낮음" : "보통"}
                    </Badge>
                    {task.points > 0 && (
                      <span className="text-[10px] text-amber-600">{task.points}P</span>
                    )}
                    {task.already_imported && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">중복</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {newCount === 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2 text-xs text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>가져올 신규 과제가 없습니다.</span>
            </div>
          )}

          <Button
            size="sm"
            className="w-full h-8 text-xs"
            onClick={handleImport}
            disabled={isLoading || newCount === 0}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            ) : (
              <Download className="mr-2 h-3 w-3" />
            )}
            {newCount}개 과제 가져오기
          </Button>
        </div>
      )}

      {/* Step 3: 완료 */}
      {step === "done" && importResult && (
        <div className="space-y-3">
          <div className="rounded-lg bg-muted/40 p-4 text-center space-y-2">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto" />
            <p className="text-sm font-medium">가져오기 완료!</p>
            <div className="flex justify-center gap-4 text-xs text-muted-foreground">
              <span>✅ 가져옴 {importResult.imported}개</span>
              <span>⏭️ 건너뜀 {importResult.skipped}개</span>
              {importResult.errors > 0 && (
                <span className="text-destructive">❌ 오류 {importResult.errors}개</span>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={handleReset}
          >
            다시 가져오기
          </Button>
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────
// Export 탭
// ────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  todo: "대기",
  in_progress: "진행중",
  review: "검토",
  done: "완료",
}

type ExportStep = "select" | "done"

function ExportTab() {
  const { tasks } = useTaskStore()
  const [step, setStep] = useState<ExportStep>("select")
  const [databaseId, setDatabaseId] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [exportResult, setExportResult] = useState<{
    exported: number
    skipped: number
    errors: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // 필터링된 과제 목록
  const filteredTasks = tasks.filter((t: Task) =>
    statusFilter === "all" ? true : t.status === statusFilter
  )

  // 전체 선택/해제
  const allSelected =
    filteredTasks.length > 0 &&
    filteredTasks.every((t: Task) => selectedIds.has(t.id))

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredTasks.map((t: Task) => t.id)))
    }
  }

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // 필터 변경 시 선택 초기화
  useEffect(() => {
    setSelectedIds(new Set())
  }, [statusFilter])

  const parseDatabaseId = (input: string): string => {
    const match = input.match(
      /([0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12})/i
    )
    return match ? match[1] : input.trim()
  }

  const handleExport = async () => {
    const dbId = parseDatabaseId(databaseId)
    if (!dbId) {
      toast.error("Notion 데이터베이스 ID를 입력하세요.")
      return
    }
    if (selectedIds.size === 0) {
      toast.error("내보낼 과제를 선택하세요.")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/notion/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId: dbId,
          taskIds: Array.from(selectedIds),
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? "내보내기에 실패했습니다.")
        return
      }

      setExportResult(data.result)
      setStep("done")
      toast.success(`${data.result.exported}개 과제를 Notion에 내보냈습니다.`)
    } catch {
      toast.error("네트워크 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setStep("select")
    setSelectedIds(new Set())
    setExportResult(null)
  }

  // 이미 내보낸 과제 개수 (notion_id 있음)
  const alreadyExportedCount = filteredTasks.filter(
    (t: Task) => selectedIds.has(t.id) && t.notion_id
  ).length

  if (step === "done" && exportResult) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg bg-muted/40 p-4 text-center space-y-2">
          <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto" />
          <p className="text-sm font-medium">내보내기 완료!</p>
          <div className="flex justify-center gap-4 text-xs text-muted-foreground">
            <span>✅ 내보냄 {exportResult.exported}개</span>
            <span>⏭️ 건너뜀 {exportResult.skipped}개</span>
            {exportResult.errors > 0 && (
              <span className="text-destructive">❌ 오류 {exportResult.errors}개</span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            이미 내보낸 과제는 중복 방지를 위해 건너뜁니다
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs"
          onClick={handleReset}
        >
          다시 내보내기
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Notion DB ID 입력 */}
      <div className="space-y-1.5">
        <Label className="text-xs">Notion DB ID 또는 URL</Label>
        <Input
          value={databaseId}
          onChange={(e) => setDatabaseId(e.target.value)}
          placeholder="https://notion.so/... 또는 UUID"
          className="text-xs h-8"
          autoComplete="off"
        />
      </div>

      <Separator />

      {/* 상태 필터 */}
      <div className="flex items-center gap-1 flex-wrap">
        {["all", "todo", "in_progress", "review", "done"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
              statusFilter === s
                ? "bg-primary text-primary-foreground border-primary"
                : "text-muted-foreground border-border hover:border-foreground/40"
            }`}
          >
            {s === "all" ? "전체" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* 과제 선택 목록 */}
      <div className="space-y-1.5">
        {/* 전체 선택 행 */}
        <div
          className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-muted/40 cursor-pointer"
          onClick={toggleAll}
        >
          <div
            className={`h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 ${
              allSelected
                ? "bg-primary border-primary"
                : "border-border"
            }`}
          >
            {allSelected && <span className="text-[8px] text-primary-foreground font-bold">✓</span>}
          </div>
          <span className="text-xs text-muted-foreground">
            전체 선택 ({filteredTasks.length}개)
          </span>
          {selectedIds.size > 0 && (
            <Badge variant="secondary" className="ml-auto text-[9px] px-1 py-0 h-4">
              {selectedIds.size}개 선택됨
            </Badge>
          )}
        </div>

        <ScrollArea className="h-[200px]">
          <div className="space-y-1 pr-2">
            {filteredTasks.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                과제가 없습니다
              </p>
            )}
            {filteredTasks.map((task: Task) => (
              <div
                key={task.id}
                className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 cursor-pointer hover:bg-muted/40 transition-colors ${
                  selectedIds.has(task.id) ? "border-primary/50 bg-primary/5" : ""
                }`}
                onClick={() => toggleOne(task.id)}
              >
                <div
                  className={`h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 ${
                    selectedIds.has(task.id)
                      ? "bg-primary border-primary"
                      : "border-border"
                  }`}
                >
                  {selectedIds.has(task.id) && (
                    <span className="text-[8px] text-primary-foreground font-bold">✓</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{task.title}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                      task.status === "done"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : task.status === "in_progress"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        : task.status === "review"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {STATUS_LABELS[task.status]}
                  </span>
                  {task.notion_id && (
                    <span className="text-[9px] text-muted-foreground" title="이미 내보낸 과제">
                      N
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* 이미 내보낸 항목 안내 */}
      {alreadyExportedCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2 text-xs text-muted-foreground">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>
            선택 항목 중 {alreadyExportedCount}개는 이미 내보낸 과제로 건너뜁니다.
          </span>
        </div>
      )}

      <Button
        size="sm"
        className="w-full h-8 text-xs"
        onClick={handleExport}
        disabled={isLoading || selectedIds.size === 0 || !databaseId.trim()}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
        ) : (
          <Upload className="mr-2 h-3 w-3" />
        )}
        {selectedIds.size > 0
          ? `${selectedIds.size}개 Notion으로 내보내기`
          : "과제를 선택하세요"}
      </Button>
    </div>
  )
}

// ────────────────────────────────────────────
// 메인 패널
// ────────────────────────────────────────────

export function CompactNotionPanel() {
  const { user } = useAuthStore()

  // 어드민 권한 체크
  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
        <span className="mb-2 text-2xl">🔒</span>
        <p className="text-sm">관리자 권한이 필요합니다</p>
      </div>
    )
  }

  return (
    <div className="p-3">
      <Tabs defaultValue="import">
        <TabsList className="w-full h-8 mb-3">
          <TabsTrigger value="import" className="flex-1 text-xs gap-1.5">
            <Download className="h-3 w-3" />
            가져오기
          </TabsTrigger>
          <TabsTrigger value="export" className="flex-1 text-xs gap-1.5">
            <Upload className="h-3 w-3" />
            내보내기
          </TabsTrigger>
        </TabsList>
        <TabsContent value="import">
          <ImportTab />
        </TabsContent>
        <TabsContent value="export">
          <ExportTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
