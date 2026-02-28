// GET /api/notion/databases - Notion DB 목록 조회 (어드민 전용)
import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { getNotionClient } from "@/lib/notion/client"
import type { NotionDatabase } from "@/types/notion"

export async function GET() {
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
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 })
    }

    const notion = getNotionClient()

    // Notion API: 검색으로 DB 목록 조회 (타입 캐스팅으로 처리)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (notion as any).search({
      filter: { value: "database", property: "object" },
      sort: { direction: "descending", timestamp: "last_edited_time" },
      page_size: 20,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const databases: NotionDatabase[] = (response.results ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((r: any) => r.object === "database")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((db: any) => ({
        id: db.id as string,
        title: Array.isArray(db.title)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? db.title.map((t: any) => t.plain_text).join("") || "제목 없음"
          : "제목 없음",
        url: (db.url as string) ?? "",
      }))

    return NextResponse.json({ databases })
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
