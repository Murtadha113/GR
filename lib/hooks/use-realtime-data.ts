"use client"

import { useEffect, useState } from "react"
import { collection, query, onSnapshot, type QueryConstraint, type Unsubscribe } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase/config"

export function useRealtimeData<T>(collectionName: string, constraints: QueryConstraint[] = []) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null

    const setupListener = async () => {
      try {
        const db = getFirebaseDb()
        const q = query(collection(db, collectionName), ...constraints)

        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const items = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as T[]

            setData(items)
            setLoading(false)
            setError(null)
          },
          (error) => {
            console.error(`Error in realtime listener for ${collectionName}:`, error)
            setError(error.message)
            setLoading(false)
          },
        )
      } catch (error: any) {
        console.error(`Error setting up realtime listener for ${collectionName}:`, error)
        setError(error.message)
        setLoading(false)
      }
    }

    setupListener()

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [collectionName, JSON.stringify(constraints)])

  return { data, loading, error }
}
