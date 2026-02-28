// POST /api/notion/import - 과제 일괄 가져오기 (어드민 전용)
import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { getNotionClient } from "@/lib/notion/client"
import { mapNotionPageToPreview } from "@/lib/notion/mapper"
import type { NotionImportResult } from "@/types/notion"

interface ImportBody {
  databaseId: string
  preview?: boolean
  fieldMapping?: {
    titleField: string
    descriptionField: string
    dueDateField: string
    priorityField: string
    pointsField: string
  }
}

const DEFAULT_FIELD_MAPPING = {
  titleField: "Name",
  descriptionField: "Description",
  dueDateField: "Due",
  priorityField: "Priority",
  pointsField: "Points",
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

    const body: ImportBody = await req.json()
    const { databaseId, preview = false, fieldMapping = DEFAULT_FIELD_MAPPING } = body

    if (!databaseId?.trim()) {
      return NextResponse.json({ error: "databaseId가 필요합니다." }, { status: 400 })
    }

    const notion = getNotionClient()

    // Notion DB 페이지 조회 (최대 100개) - 타입 캐스팅으로 처리
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queryResponse = await (notion as any).databases.query({
      database_id: databaseId,
      page_size: 100,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pages = (queryResponse.results ?? []).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (r: any) => r.object === "page" && r.properties
    )

    // 이미 가져온 notion_id 목록 조회
    const { data: existingTasks } = await supabase
      .from("tasks")
      .select("notion_id")
      .eq("team_id", profile.team_id)
      .not("notion_id", "is", null)

    const existingNotionIds = new Set<string>(
      (existingTasks ?? [])
        .map((t: { notion_id: string | null }) => t.notion_id ?? "")
        .filter(Boolean)
    )

    // 페이지 → 미리보기 변환
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const previews = pages
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((page: any) => mapNotionPageToPreview(page, existingNotionIds, fieldMapping))
      .filter(Boolean)

    // 미리보기 모드면 여기서 반환
    if (preview) {
      return NextResponse.json({ tasks: previews })
    }

    // 실제 저장 (already_imported가 아닌 것만)
    const toImport = previews.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => p && !p.already_imported
    )
    let imported = 0
    let errors = 0

    for (const task of toImport) {
      if (!task) continue
      const { error } = await supabase.from("tasks").insert({
        team_id: profile.team_id,
        created_by: user.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        points: task.points,
        due_date: task.due_date ? new Date(task.due_date).toISOString() : null,
        notion_id: task.notion_id,
      })

      if (error) {
        errors++
      } else {
        imported++
      }
    }

    const result: NotionImportResult = {
      imported,
      skipped: previews.filter((p: { already_imported: boolean } | null) => p?.already_imported).length,
      errors,
    }

    return NextResponse.json({ result })
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
