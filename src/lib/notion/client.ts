// Notion API 클라이언트 (서버 전용)
import { Client } from "@notionhq/client"

/**
 * Notion 클라이언트 인스턴스를 반환합니다.
 * 서버 사이드에서만 사용해야 합니다.
 */
export function getNotionClient(): Client {
  const apiKey = process.env.NOTION_API_KEY
  if (!apiKey) {
    throw new Error("NOTION_API_KEY 환경변수가 설정되지 않았습니다.")
  }
  return new Client({ auth: apiKey })
}
