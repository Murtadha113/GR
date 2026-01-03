export type UserRole = "student" | "supervisor" | "coordinator"

export interface UserData {
  uid: string
  email: string
  name: string
  role: UserRole
  createdAt: any // Firestore Timestamp or Date
  studentId?: string
  department?: string
  projectId?: string
  supervisorId?: string
}

export interface Project {
  id: string
  title: string
  description: string
  status: "pending" | "approved" | "rejected" | "in-progress" | "completed"
  progress: number
  studentId: string
  supervisorId?: string
  startDate: any // Firestore Timestamp or Date
  endDate?: any
  createdAt: any
  updatedAt?: any
}

export interface Task {
  id: string
  title: string
  description: string
  status: "pending" | "in-progress" | "completed"
  priority: "low" | "medium" | "high"
  studentId: string
  projectId?: string
  dueDate?: any
  createdAt: any
  completedAt?: any
}

export interface Meeting {
  id: string
  title: string
  description?: string
  date: any // Firestore Timestamp or Date
  duration: number // in minutes
  location?: string
  meetingLink?: string
  status: "scheduled" | "completed" | "cancelled"
  studentId: string
  supervisorId: string
  projectId?: string
  notes?: string
  createdAt: any
}

export interface FileData {
  id: string
  name: string
  url: string
  size: number
  type: string
  uploadedBy: string
  uploadedAt: any
  projectId?: string
}

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  read: boolean
  createdAt: any
}

export interface Evaluation {
  id: string
  projectId: string
  studentId: string
  supervisorId: string
  score: number
  feedback: string
  criteria: {
    name: string
    score: number
    maxScore: number
  }[]
  createdAt: any
}
