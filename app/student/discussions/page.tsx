"use client"

import type React from "react"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import {
  Home,
  FolderKanban,
  CheckSquare,
  Calendar,
  FileText,
  Bell,
  User,
  MessageCircle,
  Plus,
  ThumbsUp,
  MessageSquare,
  Pin,
  Lock,
  Unlock,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/contexts/auth-context"
import { useEffect, useState } from "react"
import { getFirebaseDb } from "@/lib/firebase/config"
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  increment,
} from "firebase/firestore"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"

const sidebarItems = [
  { title: "لوحة التحكم", href: "/student/dashboard", icon: <Home className="w-5 h-5" /> },
  { title: "الملف الشخصي", href: "/student/profile", icon: <User className="w-5 h-5" /> },
  { title: "مشروعي", href: "/student/project", icon: <FolderKanban className="w-5 h-5" /> },
  { title: "المهام", href: "/student/tasks", icon: <CheckSquare className="w-5 h-5" /> },
  { title: "الاجتماعات", href: "/student/meetings", icon: <Calendar className="w-5 h-5" /> },
  { title: "النقاشات", href: "/student/discussions", icon: <MessageCircle className="w-5 h-5" /> },
  { title: "الملفات", href: "/student/files", icon: <FileText className="w-5 h-5" /> },
  { title: "الإشعارات", href: "/student/notifications", icon: <Bell className="w-5 h-5" /> },
]

interface Discussion {
  id: string
  title: string
  content: string
  authorId: string
  authorName: string
  authorRole: string
  projectId: string
  isPinned: boolean
  isClosed: boolean
  tags: string[]
  repliesCount: number
  likesCount: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

export default function StudentDiscussions() {
  const { userData, loading: authLoading } = useAuth()
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    tags: "",
  })

  useEffect(() => {
    if (!authLoading && userData?.projectId) {
      fetchDiscussions()
    }
  }, [userData, authLoading])

  const fetchDiscussions = async () => {
    if (!userData?.projectId) return

    try {
      setLoading(true)
      const db = getFirebaseDb()

      const discussionsQuery = query(
        collection(db, "discussions"),
        where("projectId", "==", userData.projectId),
        orderBy("createdAt", "desc"),
      )

      const discussionsSnapshot = await getDocs(discussionsQuery)
      const discussionsData = discussionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Discussion[]

      // Sort: pinned first, then by date
      discussionsData.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1
        if (!a.isPinned && b.isPinned) return 1
        return b.createdAt.seconds - a.createdAt.seconds
      })

      setDiscussions(discussionsData)
    } catch (error) {
      console.error("[v0] Error fetching discussions:", error)
      toast.error("حدث خطأ أثناء تحميل النقاشات")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("يرجى ملء جميع الحقول المطلوبة")
      return
    }

    if (!userData?.projectId) {
      toast.error("يجب أن تكون مسجلاً في مشروع لإنشاء نقاش")
      return
    }

    try {
      const db = getFirebaseDb()
      const tags = formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)

      await addDoc(collection(db, "discussions"), {
        title: formData.title,
        content: formData.content,
        authorId: userData.uid,
        authorName: userData.name,
        authorRole: userData.role,
        projectId: userData.projectId,
        isPinned: false,
        isClosed: false,
        tags,
        repliesCount: 0,
        likesCount: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })

      toast.success("تم إنشاء النقاش بنجاح")
      setDialogOpen(false)
      setFormData({ title: "", content: "", tags: "" })
      fetchDiscussions()
    } catch (error) {
      console.error("[v0] Error creating discussion:", error)
      toast.error("حدث خطأ أثناء إنشاء النقاش")
    }
  }

  const handleLike = async (discussionId: string) => {
    try {
      const db = getFirebaseDb()
      await updateDoc(doc(db, "discussions", discussionId), {
        likesCount: increment(1),
      })
      fetchDiscussions()
    } catch (error) {
      console.error("[v0] Error liking discussion:", error)
      toast.error("حدث خطأ")
    }
  }

  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate()
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      return "منذ دقائق"
    } else if (diffInHours < 24) {
      return `منذ ${Math.floor(diffInHours)} ساعة`
    } else if (diffInHours < 48) {
      return "منذ يوم واحد"
    } else {
      return date.toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    }
  }

  const filteredDiscussions = discussions.filter((discussion) => {
    if (activeTab === "all") return true
    if (activeTab === "open") return !discussion.isClosed
    if (activeTab === "closed") return discussion.isClosed
    return true
  })

  if (!userData?.projectId) {
    return (
      <DashboardLayout sidebarItems={sidebarItems} requiredRole="student">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageCircle className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا يوجد مشروع</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              يجب أن تكون مسجلاً في مشروع للوصول إلى النقاشات
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout sidebarItems={sidebarItems} requiredRole="student">
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
              منتدى النقاش
            </h1>
            <p className="text-muted-foreground mt-2">شارك الأفكار والأسئلة مع فريق المشروع</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                نقاش جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>إنشاء نقاش جديد</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">عنوان النقاش *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="أدخل عنوان النقاش"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">محتوى النقاش *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="اشرح موضوع النقاش بالتفصيل"
                    rows={6}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">الوسوم (اختياري)</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="مثال: تقني, تقرير, مراجعة (افصل بفاصلة)"
                  />
                  <p className="text-xs text-muted-foreground">افصل الوسوم بفاصلة</p>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    إلغاء
                  </Button>
                  <Button type="submit">إنشاء النقاش</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="all">الكل ({discussions.length})</TabsTrigger>
            <TabsTrigger value="open">مفتوح ({discussions.filter((d) => !d.isClosed).length})</TabsTrigger>
            <TabsTrigger value="closed">مغلق ({discussions.filter((d) => d.isClosed).length})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2 mt-2" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredDiscussions.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="p-4 bg-muted rounded-full mb-4">
                    <MessageCircle className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">لا توجد نقاشات</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                    لم يتم إنشاء أي نقاشات بعد. كن أول من يبدأ نقاشاً!
                  </p>
                  <Button onClick={() => setDialogOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    نقاش جديد
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredDiscussions.map((discussion, index) => (
                  <Link key={discussion.id} href={`/student/discussions/${discussion.id}`}>
                    <Card
                      className={`animate-in fade-in slide-in-from-bottom duration-500 hover:shadow-lg transition-all cursor-pointer ${
                        discussion.isPinned ? "border-primary/50 bg-primary/5" : ""
                      }`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-3 flex-1">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                {discussion.authorName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                {discussion.isPinned && (
                                  <Badge variant="default" className="gap-1">
                                    <Pin className="w-3 h-3" />
                                    مثبت
                                  </Badge>
                                )}
                                {discussion.isClosed ? (
                                  <Badge variant="secondary" className="gap-1">
                                    <Lock className="w-3 h-3" />
                                    مغلق
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="gap-1">
                                    <Unlock className="w-3 h-3" />
                                    مفتوح
                                  </Badge>
                                )}
                                {discussion.tags.map((tag) => (
                                  <Badge key={tag} variant="secondary">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                              <CardTitle className="text-xl hover:text-primary transition-colors">
                                {discussion.title}
                              </CardTitle>
                              <CardDescription className="flex items-center gap-2 text-sm">
                                <span className="font-medium">{discussion.authorName}</span>
                                <span>•</span>
                                <span>
                                  {discussion.authorRole === "supervisor"
                                    ? "المشرف"
                                    : discussion.authorRole === "student"
                                      ? "طالب"
                                      : ""}
                                </span>
                                <span>•</span>
                                <span>{formatDate(discussion.createdAt)}</span>
                              </CardDescription>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm leading-relaxed line-clamp-2">{discussion.content}</p>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              handleLike(discussion.id)
                            }}
                            className="flex items-center gap-1 hover:text-primary transition-colors"
                          >
                            <ThumbsUp className="w-4 h-4" />
                            <span>{discussion.likesCount}</span>
                          </button>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-4 h-4" />
                            <span>{discussion.repliesCount} رد</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
