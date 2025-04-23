import { type NextRequest, NextResponse } from "next/server"
import { paperStorage } from "../upload/route"
import { answerQuestion } from "@/lib/ai-service"
import { saveChat, getChat } from "@/lib/storage"

export async function POST(req: NextRequest) {
  try {
    const { message, paperId } = await req.json()

    if (!message || !paperId) {
      return NextResponse.json({ error: "Message and paperId are required" }, { status: 400 })
    }

    // Check if paper exists
    const paperData = paperStorage.get(paperId)
    if (!paperData) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 })
    }

    // Get existing chat history
    const chatHistory = await getChat(paperId)

    // Add user message to history
    chatHistory.push({ role: "user", content: message })

    // Generate AI response based on paper content and question
    const response = await answerQuestion(message, paperData.text, paperData.sections, paperData.summaries, chatHistory)

    // Add AI response to history
    chatHistory.push({ role: "assistant", content: response })

    // Save updated chat history
    await saveChat(paperId, chatHistory)

    return NextResponse.json({
      response,
    })
  } catch (error) {
    console.error("Error processing chat:", error)
    return NextResponse.json({ error: "Failed to process the chat message" }, { status: 500 })
  }
}
