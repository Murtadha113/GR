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

export interface Meeting {
  id?: string
  title: string
  description?: string
  date: any
  time: string
  duration?: number
  location?: string
  meetingLink?: string
  status: "scheduled" | "completed" | "cancelled"
  studentId: string
  supervisorId: string
  projectId?: string
  notes?: string
  createdAt?: any
  updatedAt?: any
}

export async function createMeeting(meetingData: Omit<Meeting, "id" | "createdAt">) {
  try {
    const db = getFirebaseDb()

    const docRef = await addDoc(collection(db, "meetings"), {
      ...meetingData,
      createdAt: serverTimestamp(),
    })

    await createNotification(meetingData.studentId, "اجتماع جديد", `تم جدولة اجتماع جديد: ${meetingData.title}`, "info")

    return docRef.id
  } catch (error) {
    console.error("Error creating meeting:", error)
    throw error
  }
}

export async function updateMeeting(meetingId: string, updates: Partial<Meeting>) {
  try {
    const db = getFirebaseDb()

    await updateDoc(doc(db, "meetings", meetingId), {
      ...updates,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error updating meeting:", error)
    throw error
  }
}

export async function deleteMeeting(meetingId: string) {
  try {
    const db = getFirebaseDb()
    await deleteDoc(doc(db, "meetings", meetingId))
  } catch (error) {
    console.error("Error deleting meeting:", error)
    throw error
  }
}

export async function getStudentMeetings(studentId: string): Promise<Meeting[]> {
  try {
    const db = getFirebaseDb()
    const q = query(collection(db, "meetings"), where("studentId", "==", studentId))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Meeting[]
  } catch (error) {
    console.error("Error getting student meetings:", error)
    throw error
  }
}

export async function getSupervisorMeetings(supervisorId: string): Promise<Meeting[]> {
  try {
    const db = getFirebaseDb()
    const q = query(collection(db, "meetings"), where("supervisorId", "==", supervisorId))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Meeting[]
  } catch (error) {
    console.error("Error getting supervisor meetings:", error)
    throw error
  }
}
