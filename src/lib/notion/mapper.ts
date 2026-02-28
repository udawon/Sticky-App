// Notion 페이지 ↔ Task 변환 함수 (서버 전용)
import type { NotionPreviewTask } from "@/types/notion"
import type { Task } from "@/types/database"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NotionPropertyValue = any

/** 텍스트 프로퍼티 값 추출 */
function extractText(prop: NotionPropertyValue): string {
  if (!prop) return ""
  if (prop.type === "title") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (prop.title ?? []).map((t: any) => t.plain_text).join("")
  }
  if (prop.type === "rich_text") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (prop.rich_text ?? []).map((t: any) => t.plain_text).join("")
  }
  if (prop.type === "select" && prop.select) {
    return prop.select.name ?? ""
  }
  if (prop.type === "number" && prop.number !== null && prop.number !== undefined) {
    return String(prop.number)
  }
  return ""
}

/** 날짜 프로퍼티 값 추출 */
function extractDate(prop: NotionPropertyValue): string | null {
  if (!prop) return null
  if (prop.type === "date" && prop.date) {
    return prop.date.start ?? null
  }
  return null
}

/** 숫자 프로퍼티 값 추출 */
function extractNumber(prop: NotionPropertyValue): number {
  if (!prop) return 0
  if (prop.type === "number" && prop.number !== null && prop.number !== undefined) {
    return Math.min(1000, Math.max(0, Math.round(prop.number)))
  }
  return 0
}

/** Notion 우선순위 문자열 → TaskPriority 변환 */
function parsePriority(value: string): "high" | "medium" | "low" {
  const v = value.toLowerCase()
  if (v.includes("high") || v.includes("높") || v === "상") return "high"
  if (v.includes("low") || v.includes("낮") || v === "하") return "low"
  return "medium"
}

/**
 * Notion 페이지를 미리보기 Task로 변환합니다.
 *
 * @param page - Notion 페이지 응답 객체 (any)
 * @param existingNotionIds - 이미 가져온 Notion ID 목록 (중복 방지)
 * @param fieldMapping - 필드 매핑 설정
 */
export function mapNotionPageToPreview(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  existingNotionIds: Set<string>,
  fieldMapping: {
    titleField: string
    descriptionField: string
    dueDateField: string
    priorityField: string
    pointsField: string
  }
): NotionPreviewTask | null {
  const props = page.properties ?? {}

  const title = extractText(props[fieldMapping.titleField])
  if (!title.trim()) return null // 제목 없는 항목 제외

  const description = extractText(props[fieldMapping.descriptionField])
  const dueDate = extractDate(props[fieldMapping.dueDateField])
  const priorityRaw = extractText(props[fieldMapping.priorityField])
  const points = extractNumber(props[fieldMapping.pointsField])

  return {
    notion_id: page.id as string,
    title: title.trim(),
    description: description.trim(),
    due_date: dueDate,
    priority: parsePriority(priorityRaw),
    points,
    already_imported: existingNotionIds.has(page.id as string),
  }
}

// 우선순위 → Notion select 옵션명 매핑
const PRIORITY_TO_NOTION: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
}

// 상태 → Notion select 옵션명 매핑
const STATUS_TO_NOTION: Record<string, string> = {
  todo: "대기",
  in_progress: "진행중",
  review: "검토",
  done: "완료",
}

/**
 * Sticky Task를 Notion pages.create 용 properties 객체로 변환합니다.
 *
 * @param task - Sticky Task 객체
 * @param fieldMapping - 필드 매핑 설정 (Notion DB 컬럼명)
 */
export function mapTaskToNotionProperties(
  task: Task,
  fieldMapping: {
    titleField: string
    descriptionField: string
    dueDateField: string
    priorityField: string
    statusField: string
    pointsField: string
    assigneeField: string
  },
  assigneeNames = ""
): Record<string, unknown> {
  const props: Record<string, unknown> = {
    [fieldMapping.titleField]: {
      title: [{ type: "text", text: { content: task.title } }],
    },
  }

  if (task.description) {
    props[fieldMapping.descriptionField] = {
      rich_text: [{ type: "text", text: { content: task.description.slice(0, 2000) } }],
    }
  }

  if (task.due_date) {
    props[fieldMapping.dueDateField] = {
      rich_text: [{ type: "text", text: { content: task.due_date.split("T")[0] } }],
    }
  }

  props[fieldMapping.priorityField] = {
    rich_text: [{ type: "text", text: { content: PRIORITY_TO_NOTION[task.priority] ?? "Medium" } }],
  }

  props[fieldMapping.statusField] = {
    rich_text: [{ type: "text", text: { content: STATUS_TO_NOTION[task.status] ?? "대기" } }],
  }

  props[fieldMapping.pointsField] = {
    rich_text: [{ type: "text", text: { content: String(task.points) } }],
  }

  if (assigneeNames) {
    props[fieldMapping.assigneeField] = {
      rich_text: [{ type: "text", text: { content: assigneeNames } }],
    }
  }

  return props
}
