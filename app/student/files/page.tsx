"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Home, FolderKanban, CheckSquare, Calendar, FileText, Bell, User, Download } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileUpload } from "@/components/file-upload"
import { useAuth } from "@/lib/contexts/auth-context"
import { useEffect, useState } from "react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase/config"
import { Button } from "@/components/ui/button"

const sidebarItems = [
  { title: "لوحة التحكم", href: "/student/dashboard", icon: <Home className="w-5 h-5" /> },
  { title: "الملف الشخصي", href: "/student/profile", icon: <User className="w-5 h-5" /> },
  { title: "مشروعي", href: "/student/project", icon: <FolderKanban className="w-5 h-5" /> },
  { title: "المهام", href: "/student/tasks", icon: <CheckSquare className="w-5 h-5" /> },
  { title: "الاجتماعات", href: "/student/meetings", icon: <Calendar className="w-5 h-5" /> },
  { title: "الملفات", href: "/student/files", icon: <FileText className="w-5 h-5" /> },
  { title: "الإشعارات", href: "/student/notifications", icon: <Bell className="w-5 h-5" /> },
]

export default function StudentFiles() {
  const { userData } = useAuth()
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFiles = async () => {
    if (!userData?.projectId) return

    try {
      const db = getFirebaseDb()
      const filesQuery = query(collection(db, "files"), where("projectId", "==", userData.projectId))
      const filesSnapshot = await getDocs(filesQuery)
      const filesData = filesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setFiles(filesData)
    } catch (error) {
      console.error("Error fetching files:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [userData])

  return (
    <DashboardLayout sidebarItems={sidebarItems} requiredRole="student">
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">الملفات</h1>
          <p className="text-muted-foreground mt-2">إدارة ملفات المشروع</p>
        </div>

        <FileUpload projectId={userData?.projectId} onUploadComplete={fetchFiles} />

        <Card>
          <CardHeader>
            <CardTitle>الملفات المرفوعة</CardTitle>
            <CardDescription>جميع ملفات المشروع</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : files.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد ملفات مرفوعة</p>
            ) : (
              <div className="space-y-3">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.uploadedAt ? new Date(file.uploadedAt.seconds * 1000).toLocaleDateString("ar-SA") : ""}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <a href={file.url} target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4 ml-2" />
                        تحميل
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
