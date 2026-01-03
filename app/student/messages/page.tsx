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
  MessageSquare,
  Send,
  Search,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/lib/contexts/auth-context"
import { useEffect, useState, useRef } from "react"
import { getFirebaseDb } from "@/lib/firebase/config"
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  onSnapshot,
  Timestamp,
  doc,
  getDoc,
  or,
  and,
} from "firebase/firestore"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/scroll-area"

const sidebarItems = [
  { title: "لوحة التحكم", href: "/student/dashboard", icon: <Home className="w-5 h-5" /> },
  { title: "الملف الشخصي", href: "/student/profile", icon: <User className="w-5 h-5" /> },
  { title: "مشروعي", href: "/student/project", icon: <FolderKanban className="w-5 h-5" /> },
  { title: "المهام", href: "/student/tasks", icon: <CheckSquare className="w-5 h-5" /> },
  { title: "الاجتماعات", href: "/student/meetings", icon: <Calendar className="w-5 h-5" /> },
  { title: "الرسائل", href: "/student/messages", icon: <MessageSquare className="w-5 h-5" /> },
  { title: "الملفات", href: "/student/files", icon: <FileText className="w-5 h-5" /> },
  { title: "الإشعارات", href: "/student/notifications", icon: <Bell className="w-5 h-5" /> },
]

interface Message {
  id: string
  senderId: string
  senderName: string
  receiverId: string
  receiverName: string
  content: string
  createdAt: Timestamp
  read: boolean
}

interface Conversation {
  userId: string
  userName: string
  userRole: string
  lastMessage: string
  lastMessageTime: Timestamp
  unreadCount: number
}

export default function StudentMessages() {
  const { userData, loading: authLoading } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (!authLoading && userData) {
      fetchConversations()
    }
  }, [userData, authLoading])

  useEffect(() => {
    if (selectedConversation && userData) {
      const unsubscribe = subscribeToMessages(selectedConversation.userId)
      return () => unsubscribe()
    }
  }, [selectedConversation, userData])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const fetchConversations = async () => {
    if (!userData) return

    try {
      setLoading(true)
      const db = getFirebaseDb()

      // Get supervisor info
      let supervisorData = null
      if (userData.supervisorId) {
        const supervisorDoc = await getDoc(doc(db, "users", userData.supervisorId))
        if (supervisorDoc.exists()) {
          supervisorData = { id: supervisorDoc.id, ...supervisorDoc.data() }
        }
      }

      // Fetch all messages involving this user
      const messagesQuery = query(
        collection(db, "messages"),
        or(where("senderId", "==", userData.uid), where("receiverId", "==", userData.uid)),
        orderBy("createdAt", "desc"),
      )

      const messagesSnapshot = await getDocs(messagesQuery)
      const allMessages = messagesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[]

      // Group messages by conversation partner
      const conversationsMap = new Map<string, Conversation>()

      allMessages.forEach((msg) => {
        const partnerId = msg.senderId === userData.uid ? msg.receiverId : msg.senderId
        const partnerName = msg.senderId === userData.uid ? msg.receiverName : msg.senderName

        if (!conversationsMap.has(partnerId)) {
          conversationsMap.set(partnerId, {
            userId: partnerId,
            userName: partnerName,
            userRole: partnerId === userData.supervisorId ? "supervisor" : "unknown",
            lastMessage: msg.content,
            lastMessageTime: msg.createdAt,
            unreadCount: msg.receiverId === userData.uid && !msg.read ? 1 : 0,
          })
        } else {
          const conv = conversationsMap.get(partnerId)!
          if (msg.receiverId === userData.uid && !msg.read) {
            conv.unreadCount++
          }
        }
      })

      // Add supervisor to conversations if exists and no messages yet
      if (supervisorData && !conversationsMap.has(supervisorData.id)) {
        conversationsMap.set(supervisorData.id, {
          userId: supervisorData.id,
          userName: supervisorData.name,
          userRole: "supervisor",
          lastMessage: "ابدأ محادثة جديدة",
          lastMessageTime: Timestamp.now(),
          unreadCount: 0,
        })
      }

      const conversationsArray = Array.from(conversationsMap.values()).sort(
        (a, b) => b.lastMessageTime.seconds - a.lastMessageTime.seconds,
      )

      setConversations(conversationsArray)

      // Auto-select supervisor conversation if exists
      if (supervisorData && conversationsArray.length > 0) {
        const supervisorConv = conversationsArray.find((c) => c.userId === supervisorData.id)
        if (supervisorConv) {
          setSelectedConversation(supervisorConv)
        }
      }
    } catch (error) {
      console.error("[v0] Error fetching conversations:", error)
      toast.error("حدث خطأ أثناء تحميل المحادثات")
    } finally {
      setLoading(false)
    }
  }

  const subscribeToMessages = (partnerId: string) => {
    if (!userData) return () => {}

    const db = getFirebaseDb()
    const messagesQuery = query(
      collection(db, "messages"),
      or(
        and(where("senderId", "==", userData.uid), where("receiverId", "==", partnerId)),
        and(where("senderId", "==", partnerId), where("receiverId", "==", userData.uid)),
      ),
      orderBy("createdAt", "asc"),
    )

    return onSnapshot(messagesQuery, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[]
      setMessages(msgs)
    })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim() || !selectedConversation || !userData) return

    try {
      setSending(true)
      const db = getFirebaseDb()

      await addDoc(collection(db, "messages"), {
        senderId: userData.uid,
        senderName: userData.name,
        receiverId: selectedConversation.userId,
        receiverName: selectedConversation.userName,
        content: newMessage.trim(),
        createdAt: Timestamp.now(),
        read: false,
      })

      setNewMessage("")
      scrollToBottom()
    } catch (error) {
      console.error("[v0] Error sending message:", error)
      toast.error("حدث خطأ أثناء إرسال الرسالة")
    } finally {
      setSending(false)
    }
  }

  const formatTime = (timestamp: Timestamp) => {
    const date = timestamp.toDate()
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      return "الآن"
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })
    } else {
      return date.toLocaleDateString("ar-SA", { month: "short", day: "numeric" })
    }
  }

  const filteredConversations = conversations.filter((conv) =>
    conv.userName.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <DashboardLayout sidebarItems={sidebarItems} requiredRole="student">
      <div className="h-[calc(100vh-8rem)] flex gap-4 animate-in fade-in duration-500">
        {/* Conversations List */}
        <Card className="w-80 flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              المحادثات
            </h2>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">لا توجد محادثات</p>
              </div>
            ) : (
              <div className="p-2">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.userId}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full p-3 rounded-lg flex items-center gap-3 hover:bg-muted transition-colors ${
                      selectedConversation?.userId === conv.userId ? "bg-muted" : ""
                    }`}
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {conv.userName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-right overflow-hidden">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-sm truncate">{conv.userName}</p>
                        {conv.unreadCount > 0 && (
                          <span className="bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Messages Area */}
        <Card className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {selectedConversation.userName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{selectedConversation.userName}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedConversation.userRole === "supervisor" ? "المشرف" : ""}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">لا توجد رسائل بعد</p>
                      <p className="text-sm text-muted-foreground mt-1">ابدأ المحادثة بإرسال رسالة</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOwn = msg.senderId === userData?.uid
                      return (
                        <div key={msg.id} className={`flex ${isOwn ? "justify-start" : "justify-end"}`}>
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                            }`}
                          >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            <p
                              className={`text-xs mt-1 ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                            >
                              {formatTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="اكتب رسالتك..."
                    className="resize-none"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage(e)
                      }
                    }}
                  />
                  <Button type="submit" size="icon" disabled={!newMessage.trim() || sending} className="h-auto">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-20 h-20 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">اختر محادثة</h3>
                <p className="text-sm text-muted-foreground">اختر محادثة من القائمة لبدء المراسلة</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  )
}
