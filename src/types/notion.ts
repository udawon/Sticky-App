// Notion 연동 타입 정의

export interface NotionFieldMapping {
  titleField: string      // 과제명에 매핑될 Notion 필드명
  descriptionField: string // 설명에 매핑될 Notion 필드명
  dueDateField: string    // 마감일에 매핑될 Notion 필드명
  priorityField: string   // 우선순위에 매핑될 Notion 필드명
  statusField: string     // 상태에 매핑될 Notion 필드명
  pointsField: string     // 포인트에 매핑될 Notion 필드명
}

export interface NotionPreviewTask {
  notion_id: string
  title: string
  description: string
  due_date: string | null
  priority: "high" | "medium" | "low"
  points: number
  already_imported: boolean // 이미 가져온 항목 여부
}

export interface NotionImportResult {
  imported: number
  skipped: number
  errors: number
}

export interface NotionDatabase {
  id: string
  title: string
  url: string
}

export interface NotionExportResult {
  exported: number
  skipped: number
  errors: number
}
