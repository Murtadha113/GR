import { getFirebaseDb } from "./config"
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore"
import { createNotification } from "./notifications"

export interface Task {
  id?: string
  title: string
  description: string
  status: "pending" | "in-progress" | "completed"
  priority: "low" | "medium" | "high"
  studentId: string
  supervisorId: string
  projectId?: string
  dueDate?: any
  createdAt?: any
  updatedAt?: any
  completedAt?: any
}

export async function createTask(taskData: Omit<Task, "id" | "createdAt">) {
  try {
    const db = getFirebaseDb()

    const docRef = await addDoc(collection(db, "tasks"), {
      ...taskData,
      status: "pending",
      createdAt: serverTimestamp(),
    })

    await createNotification(taskData.studentId, "مهمة جديدة", `تم إضافة مهمة جديدة: ${taskData.title}`, "info")

    return docRef.id
  } catch (error) {
    console.error("Error creating task:", error)
    throw error
  }
}

export async function updateTask(taskId: string, updates: Partial<Task>) {
  try {
    const db = getFirebaseDb()

    await updateDoc(doc(db, "tasks", taskId), {
      ...updates,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error updating task:", error)
    throw error
  }
}

export async function deleteTask(taskId: string) {
  try {
    const db = getFirebaseDb()
    await deleteDoc(doc(db, "tasks", taskId))
  } catch (error) {
    console.error("Error deleting task:", error)
    throw error
  }
}

export async function getStudentTasks(studentId: string): Promise<Task[]> {
  try {
    const db = getFirebaseDb()
    const q = query(collection(db, "tasks"), where("studentId", "==", studentId))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Task[]
  } catch (error) {
    console.error("Error getting student tasks:", error)
    throw error
  }
}

export async function getSupervisorTasks(supervisorId: string): Promise<Task[]> {
  try {
    const db = getFirebaseDb()
    const q = query(collection(db, "tasks"), where("supervisorId", "==", supervisorId))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Task[]
  } catch (error) {
    console.error("Error getting supervisor tasks:", error)
    throw error
  }
}
