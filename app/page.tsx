"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Upload, Send, FileText, MessageSquare } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function ResearchPaperChatbot() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [currentPaper, setCurrentPaper] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([])
  const [summaries, setSummaries] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setLoading(true)
    setProcessing(true)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload file")
      }

      const data = await response.json()
      setCurrentPaper(data.paperId)
      setSummaries(data.summaries)
      setChatHistory([
        {
          role: "system",
          content: "I've analyzed your research paper. You can ask me questions about it now.",
        },
      ])
    } catch (error) {
      console.error("Error uploading file:", error)
    } finally {
      setLoading(false)
      setProcessing(false)
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim() || !currentPaper) return

    const userMessage = { role: "user", content: message }
    setChatHistory((prev) => [...prev, userMessage])
    setMessage("")
    setLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          paperId: currentPaper,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const data = await response.json()
      setChatHistory((prev) => [...prev, { role: "assistant", content: data.response }])
    } catch (error) {
      console.error("Error sending message:", error)
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error processing your request." },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">Research Paper Chatbot (Gemini)</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Upload Research Paper</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="flex flex-col items-center justify-center cursor-pointer">
                  <Upload className="h-10 w-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-1">{file ? file.name : "Click to upload a PDF"}</p>
                  <p className="text-xs text-gray-500">PDF files only</p>
                </label>
              </div>

              <Button onClick={handleUpload} disabled={!file || processing} className="w-full">
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Analyze Paper
                  </>
                )}
              </Button>
            </div>

            {currentPaper && (
              <div className="mt-6">
                <h3 className="font-medium mb-2">Current Paper</h3>
                <Badge variant="outline" className="w-full justify-start py-2 px-3 font-normal">
                  {file?.name || "Research Paper"}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          {currentPaper ? (
            <Tabs defaultValue="chat">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="summaries">Summaries</TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="flex flex-col gap-4 py-4">
                        {chatHistory.map(
                          (msg, index) =>
                            msg.role !== "system" && (
                              <div
                                key={index}
                                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                              >
                                <div
                                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                                  }`}
                                >
                                  {msg.content}
                                </div>
                              </div>
                            ),
                        )}
                      </div>
                    </ScrollArea>

                    <div className="flex items-center gap-2 mt-4">
                      <Textarea
                        placeholder="Ask a question about the paper..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage()
                          }
                        }}
                      />
                      <Button onClick={handleSendMessage} disabled={loading || !message.trim()} size="icon">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="summaries" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    <ScrollArea className="h-[450px] pr-4">
                      {Object.entries(summaries).map(([section, summary]) => (
                        <div key={section} className="mb-6">
                          <h3 className="font-semibold text-lg mb-2 capitalize">{section}</h3>
                          <p className="text-sm text-gray-700">{summary}</p>
                        </div>
                      ))}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium mb-2">No Paper Uploaded</h3>
                <p className="text-gray-500 mb-6">
                  Upload a research paper to start analyzing and chatting about its content.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
