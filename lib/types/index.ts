export type UserRole = "student" | "supervisor" | "coordinator"

export interface UserData {
  uid: string
  email: string
  name: string
  role: UserRole
  createdAt: any
  studentId?: string
  department?: string
  projectId?: string
  supervisorId?: string
}

export interface Project {
  id: string
  title: string
  description: string
  status: "pending" | "approved" | "rejected" | "active" | "completed"
  progress: number // calculated from completed weighted tasks
  studentId: string
  supervisorId?: string
  startDate: any
  endDate?: any
  createdAt: any
  updatedAt?: any
}

export interface Task {
  id: string
  title: string
  description: string
  status: "pending" | "submitted" | "graded"
  priority: "low" | "medium" | "high"
  studentId: string
  supervisorId?: string
  projectId?: string
  maxGrade: number
  grade?: number
  weight: number
  feedback?: string
  submissionText?: string
  submittedFiles?: SubmittedFile[] // Files uploaded with submission
  submittedAt?: any
  gradedAt?: any
  dueDate?: any
  createdAt: any
}

export interface SubmittedFile {
  id: string
  name: string
  url: string
  size: number
  type: string
  isImage: boolean
  uploadedAt: any
}

export interface Meeting {
  id: string
  title: string
  description?: string
  date: any
  duration: number
  location?: string
  meetingLink?: string
  status: "scheduled" | "completed" | "cancelled"
  studentId: string
  supervisorId: string
  projectId?: string
  notes?: string
  createdAt: any
}

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error" | "task" | "grade"
  read: boolean
  link?: string
  createdAt: any
}
