// POST /api/notion/export - 과제 → Notion DB 내보내기 (어드민 전용)
import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { getNotionClient } from "@/lib/notion/client"
import { mapTaskToNotionProperties } from "@/lib/notion/mapper"
import type { NotionExportResult } from "@/types/notion"

interface ExportBody {
  databaseId: string
  taskIds: string[]
  fieldMapping?: {
    titleField: string
    descriptionField: string
    dueDateField: string
    priorityField: string
    statusField: string
    pointsField: string
    assigneeField: string
  }
}

const DEFAULT_FIELD_MAPPING = {
  titleField: "과제명",
  descriptionField: "설명",
  dueDateField: "마감일",
  priorityField: "중요도",
  statusField: "상태변경",
  pointsField: "포인트",
  assigneeField: "담당자",
}

export async function POST(req: NextRequest) {
  try {
    // 어드민 권한 확인
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, team_id")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 })
    }

    if (!profile.team_id) {
      return NextResponse.json({ error: "팀 정보를 찾을 수 없습니다." }, { status: 400 })
    }

    const body: ExportBody = await req.json()
    const { databaseId, taskIds, fieldMapping = DEFAULT_FIELD_MAPPING } = body

    if (!databaseId?.trim()) {
      return NextResponse.json({ error: "databaseId가 필요합니다." }, { status: 400 })
    }

    if (!taskIds?.length) {
      return NextResponse.json({ error: "내보낼 과제를 선택하세요." }, { status: 400 })
    }

    // 내보낼 과제 조회 (같은 팀의 과제만)
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .eq("team_id", profile.team_id)
      .in("id", taskIds)

    if (tasksError || !tasks) {
      return NextResponse.json({ error: "과제 조회에 실패했습니다." }, { status: 500 })
    }

    // 담당자 UUID → 닉네임 맵 생성
    const allAssigneeIds = [...new Set(tasks.flatMap((t) => t.assigned_to ?? []))]
    const nicknameMap: Record<string, string> = {}
    if (allAssigneeIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nickname")
        .in("id", allAssigneeIds)
      for (const p of profiles ?? []) {
        nicknameMap[p.id] = p.nickname
      }
    }

    const notion = getNotionClient()
    let exported = 0
    let skipped = 0
    let errors = 0

    for (const task of tasks) {
      // 이미 Notion에 내보낸 과제는 건너뜀
      if (task.notion_id) {
        skipped++
        continue
      }

      // 담당자 닉네임 (쉼표 구분)
      const assigneeNames = (task.assigned_to ?? [])
        .map((id: string) => nicknameMap[id] ?? id)
        .join(", ")

      try {
        const properties = mapTaskToNotionProperties(task, fieldMapping, assigneeNames)

        // Notion 페이지 생성
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const page = await (notion as any).pages.create({
          parent: { database_id: databaseId },
          properties,
        })

        // 생성된 Notion 페이지 ID를 tasks.notion_id에 저장
        await supabase
          .from("tasks")
          .update({ notion_id: page.id })
          .eq("id", task.id)

        exported++
      } catch (err) {
        console.error(`[Notion Export] task ${task.id} 실패:`, err)
        errors++
      }
    }

    const result: NotionExportResult = { exported, skipped, errors }
    return NextResponse.json({ result })
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
