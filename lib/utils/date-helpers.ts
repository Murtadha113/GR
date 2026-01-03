export function formatDate(date: any): string {
  if (!date) return ""

  let jsDate: Date

  if (date?.toDate && typeof date.toDate === "function") {
    jsDate = date.toDate()
  } else if (date instanceof Date) {
    jsDate = date
  } else if (typeof date === "string" || typeof date === "number") {
    jsDate = new Date(date)
  } else {
    return ""
  }

  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(jsDate)
}

export function formatDateTime(date: any): string {
  if (!date) return ""

  let jsDate: Date

  if (date?.toDate && typeof date.toDate === "function") {
    jsDate = date.toDate()
  } else if (date instanceof Date) {
    jsDate = date
  } else if (typeof date === "string" || typeof date === "number") {
    jsDate = new Date(date)
  } else {
    return ""
  }

  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(jsDate)
}

export function formatTime(date: any): string {
  if (!date) return ""

  let jsDate: Date

  if (date?.toDate && typeof date.toDate === "function") {
    jsDate = date.toDate()
  } else if (date instanceof Date) {
    jsDate = date
  } else if (typeof date === "string" || typeof date === "number") {
    jsDate = new Date(date)
  } else {
    return ""
  }

  return new Intl.DateTimeFormat("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(jsDate)
}

export function formatRelativeTime(date: any): string {
  if (!date) return ""

  let jsDate: Date

  if (date?.toDate && typeof date.toDate === "function") {
    jsDate = date.toDate()
  } else if (date instanceof Date) {
    jsDate = date
  } else if (typeof date === "string" || typeof date === "number") {
    jsDate = new Date(date)
  } else {
    return ""
  }

  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - jsDate.getTime()) / 1000)

  if (diffInSeconds < 60) return "الآن"
  if (diffInSeconds < 3600) return `منذ ${Math.floor(diffInSeconds / 60)} دقيقة`
  if (diffInSeconds < 86400) return `منذ ${Math.floor(diffInSeconds / 3600)} ساعة`
  if (diffInSeconds < 604800) return `منذ ${Math.floor(diffInSeconds / 86400)} يوم`

  return formatDate(jsDate)
}

export function isUpcoming(date: any): boolean {
  if (!date) return false

  let jsDate: Date

  if (date?.toDate && typeof date.toDate === "function") {
    jsDate = date.toDate()
  } else if (date instanceof Date) {
    jsDate = date
  } else if (typeof date === "string" || typeof date === "number") {
    jsDate = new Date(date)
  } else {
    return false
  }

  return jsDate.getTime() > Date.now()
}

export function isPast(date: any): boolean {
  return !isUpcoming(date)
}

export function getDaysUntil(date: any): number {
  if (!date) return 0

  let jsDate: Date

  if (date?.toDate && typeof date.toDate === "function") {
    jsDate = date.toDate()
  } else if (date instanceof Date) {
    jsDate = date
  } else if (typeof date === "string" || typeof date === "number") {
    jsDate = new Date(date)
  } else {
    return 0
  }

  const now = new Date()
  const diffInMs = jsDate.getTime() - now.getTime()
  return Math.ceil(diffInMs / (1000 * 60 * 60 * 24))
}
