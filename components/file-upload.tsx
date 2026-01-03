"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, type File, X, Loader2 } from "lucide-react"
import { uploadFile } from "@/lib/firebase/storage"
import { useAuth } from "@/lib/contexts/auth-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { formatFileSize, getFileIcon } from "@/lib/utils/format"

interface FileUploadProps {
  projectId?: string
  onUploadComplete?: () => void
  maxFiles?: number
  maxFileSize?: number
  accept?: string
}

export function FileUpload({
  projectId,
  onUploadComplete,
  maxFiles = 10,
  maxFileSize = 10 * 1024 * 1024,
  accept,
}: FileUploadProps) {
  const { userData } = useAuth()
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)

      if (files.length > maxFiles) {
        setError(`يمكنك رفع ${maxFiles} ملفات كحد أقصى`)
        return
      }

      const oversizedFiles = files.filter((f) => f.size > maxFileSize)
      if (oversizedFiles.length > 0) {
        setError(`حجم الملف يجب أن يكون أقل من ${formatFileSize(maxFileSize)}`)
        return
      }

      setSelectedFiles(files)
      setError("")
      setSuccess("")
    }
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (!userData?.uid || selectedFiles.length === 0) return

    setUploading(true)
    setError("")
    setSuccess("")
    setUploadProgress(0)

    try {
      const totalFiles = selectedFiles.length
      let uploadedCount = 0

      for (const file of selectedFiles) {
        await uploadFile(file, userData.uid, projectId, (progress) => {
          const overallProgress = (uploadedCount / totalFiles) * 100 + progress / totalFiles
          setUploadProgress(Math.round(overallProgress))
        })
        uploadedCount++
      }

      setSuccess(`تم رفع ${totalFiles} ملف بنجاح`)
      setSelectedFiles([])
      setUploadProgress(100)

      setTimeout(() => {
        setSuccess("")
        setUploadProgress(0)
      }, 3000)

      onUploadComplete?.()
    } catch (err) {
      console.error("Upload error:", err)
      setError("حدث خطأ أثناء رفع الملفات. يرجى المحاولة مرة أخرى")
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)

    if (files.length > maxFiles) {
      setError(`يمكنك رفع ${maxFiles} ملفات كحد أقصى`)
      return
    }

    const oversizedFiles = files.filter((f) => f.size > maxFileSize)
    if (oversizedFiles.length > 0) {
      setError(`حجم الملف يجب أن يكون أقل من ${formatFileSize(maxFileSize)}`)
      return
    }

    setSelectedFiles(files)
    setError("")
    setSuccess("")
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive" className="animate-in slide-in-from-top duration-300">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="animate-in slide-in-from-top duration-300 border-green-500 bg-green-50 dark:bg-green-900/20">
          <AlertDescription className="text-green-900 dark:text-green-100">{success}</AlertDescription>
        </Alert>
      )}

      <Card className="rounded-xl hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center transition-colors hover:border-primary hover:bg-accent/50"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2">اسحب الملفات هنا أو انقر للاختيار</p>
              <p className="text-xs text-muted-foreground mb-4">
                الحد الأقصى: {maxFiles} ملفات، {formatFileSize(maxFileSize)} لكل ملف
              </p>
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                disabled={uploading}
                accept={accept}
              />
              <label htmlFor="file-upload">
                <Button
                  variant="outline"
                  disabled={uploading}
                  asChild
                  className="rounded-lg cursor-pointer bg-transparent"
                >
                  <span>اختيار الملفات</span>
                </Button>
              </label>
            </div>

            {uploading && uploadProgress > 0 && (
              <div className="space-y-2 animate-in slide-in-from-bottom duration-300">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">جاري الرفع...</span>
                  <span className="font-medium">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {selectedFiles.length > 0 && (
              <div className="space-y-3 animate-in slide-in-from-bottom duration-300">
                <p className="text-sm font-medium">الملفات المحددة ({selectedFiles.length}):</p>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-2xl">{getFileIcon(file.type)}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(index)}
                        disabled={uploading}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full rounded-lg shadow-md hover:shadow-lg transition-all"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      جاري الرفع...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 ml-2" />
                      رفع {selectedFiles.length} {selectedFiles.length === 1 ? "ملف" : "ملفات"}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
