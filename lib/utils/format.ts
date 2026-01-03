export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 بايت"
  const k = 1024
  const sizes = ["بايت", "كيلوبايت", "ميغابايت", "غيغابايت"]
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
  if (fileType.includes("powerpoint") || fileType.includes("presentation")) return "📽️"
  if (fileType.includes("zip") || fileType.includes("rar") || fileType.includes("tar")) return "🗜️"
  if (fileType.includes("text/")) return "📃"
  return "📎"
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "")
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + "..."
}
