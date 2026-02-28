import { z } from "zod"

export const taskSchema = z.object({
  title: z
    .string()
    .min(1, "과제명은 필수입니다")
    .max(100, "과제명은 100자 이하여야 합니다"),
  description: z.string().max(1000, "설명은 1000자 이하여야 합니다"),
  priority: z.enum(["high", "medium", "low"]),
  points: z
    .number({ message: "숫자를 입력하세요" })
    .int("정수만 입력 가능합니다")
    .min(0, "0 이상이어야 합니다")
    .max(1000, "1000 이하여야 합니다"),
  dueDate: z.string(),
  assignedTo: z.array(z.string()),
})

export type TaskFormValues = z.infer<typeof taskSchema>
