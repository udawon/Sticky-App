import { create } from "zustand"
import type { Task, TaskStatus } from "@/types/database"

export type SortBy = "due_date" | "priority" | "points" | "created_at"
export type SortOrder = "asc" | "desc"

// 우선순위 정렬 가중치
const PRIORITY_WEIGHT: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
}

interface TaskState {
  tasks: Task[]
  filter: TaskStatus | "all"
  sortBy: SortBy
  sortOrder: SortOrder
  assigneeFilter: boolean // true = 내 과제만
  searchQuery: string
  changingStatusMap: Record<string, boolean> // taskId별 상태 변경 중 여부

  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  removeTask: (id: string) => void
  setFilter: (filter: TaskStatus | "all") => void
  setSortBy: (sortBy: SortBy) => void
  setSortOrder: (sortOrder: SortOrder) => void
  setAssigneeFilter: (v: boolean) => void
  setSearchQuery: (q: string) => void
  setChangingStatus: (taskId: string, v: boolean) => void
  isChangingStatus: (taskId: string) => boolean

  // 필터링 + 정렬된 과제 목록 반환 (userId 필요)
  getFilteredSortedTasks: (userId: string | undefined) => Task[]
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  filter: "all",
  sortBy: "created_at",
  sortOrder: "desc",
  assigneeFilter: false,
  searchQuery: "",
  changingStatusMap: {},

  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),
  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  removeTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    })),
  setFilter: (filter) => set({ filter }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  setAssigneeFilter: (v) => set({ assigneeFilter: v }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  setChangingStatus: (taskId, v) =>
    set((state) => ({
      changingStatusMap: { ...state.changingStatusMap, [taskId]: v },
    })),

  isChangingStatus: (taskId) => !!get().changingStatusMap[taskId],

  getFilteredSortedTasks: (userId) => {
    const { tasks, filter, assigneeFilter, searchQuery, sortBy, sortOrder } = get()

    let result = tasks

    // 상태 필터
    if (filter !== "all") {
      result = result.filter((t) => t.status === filter)
    }

    // 담당자 필터 (내 과제만)
    if (assigneeFilter && userId) {
      result = result.filter((t) => t.assigned_to.includes(userId))
    }

    // 검색 필터
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter((t) => t.title.toLowerCase().includes(q))
    }

    // 정렬
    result = [...result].sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case "due_date":
          if (!a.due_date && !b.due_date) cmp = 0
          else if (!a.due_date) cmp = 1
          else if (!b.due_date) cmp = -1
          else cmp = new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          break
        case "priority":
          cmp = (PRIORITY_WEIGHT[b.priority] ?? 0) - (PRIORITY_WEIGHT[a.priority] ?? 0)
          break
        case "points":
          cmp = b.points - a.points
          break
        case "created_at":
        default:
          cmp = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          break
      }
      return sortOrder === "asc" ? -cmp : cmp
    })

    return result
  },
}))
