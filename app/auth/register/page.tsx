"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signUp, type UserRole } from "@/lib/firebase/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GraduationCap, Loader2, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase/config"

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "" as UserRole,
    studentId: "",
    department: "",
    supervisorId: "", // Added supervisor selection
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [supervisors, setSupervisors] = useState<any[]>([])
  const [loadingSupervisors, setLoadingSupervisors] = useState(false)

  useEffect(() => {
    const fetchSupervisors = async () => {
      if (formData.role !== "student") return

      try {
        setLoadingSupervisors(true)
        const supervisorsQuery = query(collection(db, "users"), where("role", "==", "supervisor"))
        const supervisorsSnapshot = await getDocs(supervisorsQuery)
        const supervisorsData = supervisorsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setSupervisors(supervisorsData)
      } catch (error) {
        console.error("[v0] Error fetching supervisors:", error)
      } finally {
        setLoadingSupervisors(false)
      }
    }

    fetchSupervisors()
  }, [formData.role])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("كلمة المرور غير متطابقة")
      return
    }

    if (!formData.role) {
      setError("يرجى اختيار الدور")
      return
    }

    if (!formData.email.includes("@")) {
      setError("يرجى إدخال بريد إلكتروني صحيح")
      return
    }

    setLoading(true)

    try {
      const additionalData: any = {
        department: formData.department,
      }

      if (formData.role === "student") {
        additionalData.studentId = formData.studentId
        if (formData.supervisorId) {
          additionalData.supervisorId = formData.supervisorId
        }
      }

      await signUp(formData.email, formData.password, formData.name, formData.role, additionalData)

      setSuccess(true)

      setTimeout(() => {
        if (formData.role === "student") {
          router.push("/student/dashboard")
        } else if (formData.role === "supervisor") {
          router.push("/supervisor/dashboard")
        } else if (formData.role === "coordinator") {
          router.push("/coordinator/dashboard")
        }
      }, 3000)
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء التسجيل")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="bg-green-500 text-white p-3 rounded-full">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">تم إنشاء الحساب بنجاح!</CardTitle>
            <CardDescription>تم إرسال رسالة تحقق إلى بريدك الإلكتروني</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription className="text-center">
                يرجى التحقق من بريدك الإلكتروني <strong>{formData.email}</strong> والنقر على رابط التحقق لتفعيل حسابك.
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground text-center">سيتم توجيهك إلى لوحة التحكم خلال لحظات...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 animate-fade-in">
      <Card className="w-full max-w-md animate-slide-up">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="bg-primary text-primary-foreground p-3 rounded-full">
              <GraduationCap className="w-8 h-8" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">إنشاء حساب جديد</CardTitle>
          <CardDescription>منصة مشاريع التخرج</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">الاسم الكامل</Label>
              <Input
                id="name"
                type="text"
                placeholder="أحمد محمد"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@university.edu"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">الدور</Label>
              <Select
                value={formData.role}
                onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الدور" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">طالب</SelectItem>
                  <SelectItem value="supervisor">مشرف</SelectItem>
                  <SelectItem value="coordinator">منسق أكاديمي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.role === "student" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="studentId">الرقم الجامعي</Label>
                  <Input
                    id="studentId"
                    type="text"
                    placeholder="202012345"
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supervisor">المشرف (اختياري)</Label>
                  <Select
                    value={formData.supervisorId}
                    onValueChange={(value) => setFormData({ ...formData, supervisorId: value })}
                    disabled={loading || loadingSupervisors}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingSupervisors ? "جاري التحميل..." : "اختر المشرف"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون مشرف (سيتم التعيين لاحقاً)</SelectItem>
                      {supervisors.map((supervisor) => (
                        <SelectItem key={supervisor.id} value={supervisor.id}>
                          {supervisor.name} - {supervisor.department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    يمكنك اختيار مشرف الآن أو سيتم تعيينه لاحقاً من قبل المنسق
                  </p>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="department">القسم</Label>
              <Input
                id="department"
                type="text"
                placeholder="علوم الحاسب"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري إنشاء الحساب...
                </>
              ) : (
                "إنشاء حساب"
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              لديك حساب بالفعل؟{" "}
              <Link href="/auth/login" className="text-primary hover:underline">
                تسجيل الدخول
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
