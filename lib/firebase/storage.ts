import { getFirebaseStorage, getFirebaseDb } from "./config"
import { ref, uploadBytesResumable, getDownloadURL, deleteObject, type UploadTaskSnapshot } from "firebase/storage"
import { collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc, doc } from "firebase/firestore"

export interface FileMetadata {
  id?: string
  name: string
  url: string
  size: number
  type: string
  uploadedBy: string
  uploadedAt: any
  projectId?: string
  path: string
}

export async function uploadFile(
  file: File,
  userId: string,
  projectId?: string,
  onProgress?: (progress: number) => void,
): Promise<{ url: string; metadata: FileMetadata }> {
  try {
    const storage = getFirebaseStorage()
    const db = getFirebaseDb()

    const timestamp = Date.now()
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const path = projectId
      ? `projects/${projectId}/${timestamp}_${safeFileName}`
      : `users/${userId}/${timestamp}_${safeFileName}`

    const storageRef = ref(storage, path)
    const uploadTask = uploadBytesResumable(storageRef, file)

    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot: UploadTaskSnapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          if (onProgress) {
            onProgress(Math.round(progress))
          }
        },
        (error) => {
          console.error("Upload error:", error)
          reject(error)
        },
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref)

            const metadata: FileMetadata = {
              name: file.name,
              url,
              size: file.size,
              type: file.type,
              uploadedBy: userId,
              uploadedAt: new Date(),
              projectId,
              path,
            }

            const fileData: any = {
              name: file.name,
              url,
              size: file.size,
              type: file.type,
              uploadedBy: userId,
              uploadedAt: serverTimestamp(),
              path,
            }

            if (projectId) {
              fileData.projectId = projectId
            }

            const docRef = await addDoc(collection(db, "files"), fileData)
            metadata.id = docRef.id

            resolve({ url, metadata })
          } catch (error) {
            reject(error)
          }
        },
      )
    })
  } catch (error) {
    console.error("Error uploading file:", error)
    throw error
  }
}

export async function listFiles(projectId: string): Promise<FileMetadata[]> {
  try {
    const db = getFirebaseDb()
    const filesRef = collection(db, "files")
    const q = query(filesRef, where("projectId", "==", projectId))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        name: data.name,
        url: data.url,
        size: data.size,
        type: data.type,
        uploadedBy: data.uploadedBy,
        uploadedAt: data.uploadedAt,
        projectId: data.projectId,
        path: data.path,
      }
    })
  } catch (error) {
    console.error("Error listing files:", error)
    throw error
  }
}

export async function getUserFiles(userId: string): Promise<FileMetadata[]> {
  try {
    const db = getFirebaseDb()
    const filesRef = collection(db, "files")
    const q = query(filesRef, where("uploadedBy", "==", userId))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        name: data.name,
        url: data.url,
        size: data.size,
        type: data.type,
        uploadedBy: data.uploadedBy,
        uploadedAt: data.uploadedAt,
        projectId: data.projectId,
        path: data.path,
      }
    })
  } catch (error) {
    console.error("Error getting user files:", error)
    throw error
  }
}

export async function deleteFile(fileId: string, filePath: string): Promise<void> {
  try {
    const storage = getFirebaseStorage()
    const db = getFirebaseDb()

    const storageRef = ref(storage, filePath)
    await deleteObject(storageRef)

    await deleteDoc(doc(db, "files", fileId))
  } catch (error) {
    console.error("Error deleting file:", error)
    throw error
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

export function getFileIcon(fileType: string): string {
  if (fileType.startsWith("image/")) return "🖼️"
  if (fileType.startsWith("video/")) return "🎥"
  if (fileType.startsWith("audio/")) return "🎵"
  if (fileType.includes("pdf")) return "📄"
  if (fileType.includes("word")) return "📝"
  if (fileType.includes("excel") || fileType.includes("spreadsheet")) return "📊"
  if (fileType.includes("powerpoint") || fileType.includes("presentation")) return "📊"
  if (fileType.includes("zip") || fileType.includes("rar")) return "🗜️"
  return "📎"
}
