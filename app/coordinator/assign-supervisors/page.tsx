"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Home, FolderKanban, Users, FileText, Archive, Lightbulb, UserCheck } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/contexts/auth-context"
import { useEffect, useState } from "react"
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

const sidebarItems = [
  { title: "لوحة التحكم", href: "/coordinator/dashboard", icon: <Home className="w-5 h-5" /> },
  { title: "المشاريع", href: "/coordinator/projects", icon: <FolderKanban className="w-5 h-5" /> },
  { title: "المشرفين", href: "/coordinator/supervisors", icon: <Users className="w-5 h-5" /> },
  { title: "تخصيص المشرفين", href: "/coordinator/assign-supervisors", icon: <UserCheck className="w-5 h-5" /> },
  { title: "أفكار المشاريع", href: "/coordinator/project-ideas", icon: <Lightbulb className="w-5 h-5" /> },
  { title: "التقارير", href: "/coordinator/reports", icon: <FileText className="w-5 h-5" /> },
  { title: "الأرشيف", href: "/coordinator/archive", icon: <Archive className="w-5 h-5" /> },
]

export default function AssignSupervisors() {
  const { userData } = useAuth()
  const { toast } = useToast()
  const [students, setStudents] = useState<any[]>([])
  const [supervisors, setSupervisors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all students
        const studentsQuery = query(collection(db, "users"), where("role", "==", "student"))
        const studentsSnapshot = await getDocs(studentsQuery)
        const studentsData = studentsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        setStudents(studentsData)

        // Fetch all supervisors
        const supervisorsQuery = query(collection(db, "users"), where("role", "==", "supervisor"))
        const supervisorsSnapshot = await getDocs(supervisorsQuery)
        const supervisorsData = supervisorsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        setSupervisors(supervisorsData)

        // Initialize assignments with current supervisors
        const initialAssignments: { [key: string]: string } = {}
        studentsData.forEach((student) => {
          if (student.supervisorId) {
            initialAssignments[student.id] = student.supervisorId
          }
        })
        setAssignments(initialAssignments)
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء تحميل البيانات",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [toast])

  const handleAssignSupervisor = async (studentId: string, supervisorId: string) => {
    try {
      await updateDoc(doc(db, "users", studentId), {
        supervisorId: supervisorId,
      })

      setAssignments((prev) => ({ ...prev, [studentId]: supervisorId }))

      toast({
        title: "تم التخصيص بنجاح",
        description: "تم تخصيص المشرف للطالب بنجاح",
      })
    } catch (error) {
      console.error("Error assigning supervisor:", error)
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تخصيص المشرف",
        variant: "destructive",
      })
    }
  }

  const getSupervisorStudentCount = (supervisorId: string) => {
    return Object.values(assignments).filter((id) => id === supervisorId).length
  }

  if (loading) {
    return (
      <DashboardLayout sidebarItems={sidebarItems} requiredRole="coordinator">
        <div className="p-8">
          <Card>
            <CardContent className="p-8">
              <p className="text-center text-muted-foreground">جاري التحميل...</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout sidebarItems={sidebarItems} requiredRole="coordinator">
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">تخصيص المشرفين</h1>
          <p className="text-muted-foreground mt-2">تخصيص مشرف لكل طالب</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{students.length}</CardTitle>
              <CardDescription>إجمالي الطلاب</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{supervisors.length}</CardTitle>
              <CardDescription>إجمالي المشرفين</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{Object.keys(assignments).length}</CardTitle>
              <CardDescription>الطلاب المخصصين</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>قائمة الطلاب</CardTitle>
            <CardDescription>تخصيص مشرف لكل طالب من القائمة</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {students.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{student.name}</p>
                    <p className="text-sm text-muted-foreground">{student.email}</p>
                    <p className="text-sm text-muted-foreground">{student.studentId}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {assignments[student.id] && (
                      <Badge variant="secondary">
                        {supervisors.find((s) => s.id === assignments[student.id])?.name || "مخصص"}
                      </Badge>
                    )}
                    <Select
                      value={assignments[student.id] || ""}
                      onValueChange={(value) => handleAssignSupervisor(student.id, value)}
                    >
                      <SelectTrigger className="w-[250px]">
                        <SelectValue placeholder="اختر المشرف" />
                      </SelectTrigger>
                      <SelectContent>
                        {supervisors.map((supervisor) => (
                          <SelectItem key={supervisor.id} value={supervisor.id}>
                            {supervisor.name} ({getSupervisorStudentCount(supervisor.id)} طالب)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>توزيع المشرفين</CardTitle>
            <CardDescription>عدد الطلاب لكل مشرف</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {supervisors.map((supervisor) => {
                const studentCount = getSupervisorStudentCount(supervisor.id)
                return (
                  <div key={supervisor.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{supervisor.name}</p>
                      <p className="text-sm text-muted-foreground">{supervisor.email}</p>
                    </div>
                    <Badge variant={studentCount > 0 ? "default" : "secondary"}>{studentCount} طالب</Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
