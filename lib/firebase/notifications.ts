import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  orderBy,
  updateDoc,
  doc,
  onSnapshot,
  limit,
  type Unsubscribe,
} from "firebase/firestore"
import { getFirebaseDb } from "./config"

export interface Notification {
  id?: string
  userId: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  read: boolean
  createdAt: any
  link?: string
}

const notificationCache = new Map<string, Notification[]>()
const activeSubscriptions = new Map<string, Unsubscribe>()

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: "info" | "success" | "warning" | "error" = "info",
  link?: string,
) {
  try {
    const db = getFirebaseDb()

    const notificationData: any = {
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: serverTimestamp(),
    }

    // Only add link if it's defined
    if (link !== undefined) {
      notificationData.link = link
    }

    await addDoc(collection(db, "notifications"), notificationData)
  } catch (error) {
    console.error("Error creating notification:", error)
    throw error
  }
}

export async function getUserNotifications(userId: string, limitCount = 50) {
  try {
    const db = getFirebaseDb()
    try {
      const notificationsQuery = query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(limitCount),
      )
      const notificationsSnapshot = await getDocs(notificationsQuery)
      return notificationsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Notification)
    } catch (indexError: any) {
      if (indexError.code === "failed-precondition" || indexError.message?.includes("index")) {
        console.warn("Firebase index not available, using fallback query")
        const fallbackQuery = query(collection(db, "notifications"), where("userId", "==", userId), limit(limitCount))
        const notificationsSnapshot = await getDocs(fallbackQuery)
        const notifications = notificationsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Notification)
        // Sort in memory
        return notifications.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0
          const bTime = b.createdAt?.toMillis?.() || 0
          return bTime - aTime
        })
      }
      throw indexError
    }
  } catch (error: any) {
    console.error("Error getting notifications:", error)
    throw error
  }
}

export async function markNotificationAsRead(notificationId: string) {
  try {
    const db = getFirebaseDb()
    await updateDoc(doc(db, "notifications", notificationId), {
      read: true,
    })
  } catch (error) {
    console.error("Error marking notification as read:", error)
    throw error
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  try {
    const db = getFirebaseDb()
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("read", "==", false),
    )
    const notificationsSnapshot = await getDocs(notificationsQuery)

    const updatePromises = notificationsSnapshot.docs.map((docSnapshot) =>
      updateDoc(doc(db, "notifications", docSnapshot.id), { read: true }),
    )

    await Promise.all(updatePromises)
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    throw error
  }
}

export function subscribeToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void,
  limitCount = 10,
): Unsubscribe {
  const existingSubscription = activeSubscriptions.get(userId)
  if (existingSubscription) {
    existingSubscription()
    activeSubscriptions.delete(userId)
  }

  const db = getFirebaseDb()
  let unsubscribe: Unsubscribe | null = null

  const simpleQuery = query(collection(db, "notifications"), where("userId", "==", userId), limit(limitCount))

  unsubscribe = onSnapshot(
    simpleQuery,
    (snapshot) => {
      const notifications = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Notification)

      const sorted = notifications.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0
        const bTime = b.createdAt?.toMillis?.() || 0
        return bTime - aTime
      })

      notificationCache.set(userId, sorted)
      callback(sorted)
    },
    (error: any) => {
      console.error("Error in notifications subscription:", error)
      const cached = notificationCache.get(userId)
      if (cached) {
        callback(cached)
      }
    },
  )

  activeSubscriptions.set(userId, unsubscribe)

  return () => {
    if (unsubscribe) {
      unsubscribe()
    }
    activeSubscriptions.delete(userId)
  }
}

export async function getUnreadNotificationsCount(userId: string): Promise<number> {
  try {
    const db = getFirebaseDb()
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("read", "==", false),
    )
    const notificationsSnapshot = await getDocs(notificationsQuery)
    return notificationsSnapshot.size
  } catch (error) {
    console.error("Error getting unread notifications count:", error)
    return 0
  }
}

export function cleanupNotificationSubscriptions() {
  activeSubscriptions.forEach((unsubscribe) => unsubscribe())
  activeSubscriptions.clear()
  notificationCache.clear()
}
