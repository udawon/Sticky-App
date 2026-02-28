// Supabase 데이터베이스 타입 정의

export type UserRole = "admin" | "member"

export type TaskStatus = "todo" | "in_progress" | "review" | "done"

export type TaskPriority = "high" | "medium" | "low"

// 사용자 프로필
export interface Profile {
  id: string
  email: string
  nickname: string
  role: UserRole
  team_id: string | null
  avatar_body: string
  avatar_accessories: string[]
  // 아바타 파츠 (5슬롯)
  avatar_hair: string
  avatar_face: string
  avatar_top: string
  avatar_bottom: string
  avatar_shoes: string
  points: number
  total_points_earned: number
  tasks_completed: number
  created_at: string
  updated_at: string
}

// 팀
export interface Team {
  id: string
  name: string
  invite_code: string
  created_by: string
  created_at: string
}

// 과제
export interface Task {
  id: string
  team_id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assigned_to: string[]
  created_by: string
  updated_by: string | null
  points: number
  due_date: string | null
  completed_at: string | null
  notion_id: string | null
  created_at: string
  updated_at: string
}

// 과제 댓글/메모
export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  content: string
  created_at: string
}

// 상점 아이템
export interface ShopItem {
  id: string
  name: string
  description: string
  category: "body" | "accessory" | "hair" | "face" | "top" | "bottom" | "shoes"
  image_key: string
  price: number
  created_at: string
}

// 구매 기록
export interface Purchase {
  id: string
  user_id: string
  item_id: string
  purchased_at: string
}

// 포인트 기록
export interface PointLog {
  id: string
  user_id: string
  amount: number
  reason: string
  task_id: string | null
  created_at: string
}

// 알림 종류
export type NotificationType =
  | "task_assigned"   // 과제 생성 시 담당자 지정
  | "assignee_added"  // 기존 과제 담당자 추가
  | "comment_added"   // 담당 과제에 메모 생성
  | "general"         // 기타 수동 알람

// 알림
export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  link: string | null
  created_at: string
}
