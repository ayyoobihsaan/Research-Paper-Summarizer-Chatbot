import { type NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { extractTextFromPDF, identifySections } from "@/lib/pdf-processor"
import { summarizeText } from "@/lib/ai-service"
import { saveChat } from "@/lib/storage"

// In-memory storage for demo purposes
// In a production app, use a database
const paperStorage = new Map()

export async function POST(req: NextRequest) {
  try {
    // Process form data
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file || !file.name.endsWith(".pdf")) {
      return NextResponse.json({ error: "Please upload a valid PDF file" }, { status: 400 })
    }

    // Generate a unique ID for this paper
    const paperId = uuidv4()

    // Extract text from PDF
    const buffer = await file.arrayBuffer()
    const pdfText = await extractTextFromPDF(buffer)

    // Identify sections in the paper
    const sections = await identifySections(pdfText)

    // Generate summaries for each section
    const summaries: Record<string, string> = {}

    // Use a simple cache to avoid redundant summarization
    const processedSections = new Set()

    for (const [sectionName, sectionText] of Object.entries(sections)) {
      // Skip empty sections
      if (!sectionText.trim()) continue

      // Create a simple hash of the section text to use as a cache key
      const sectionHash = sectionText.substring(0, 100)

      if (processedSections.has(sectionHash)) {
        console.log(`Using cached summary for section: ${sectionName}`)
        // If we've already processed this text, use the same summary
        const existingSummary = Object.values(summaries).find(
          (_, idx) => Array.from(processedSections)[idx] === sectionHash,
        )
        summaries[sectionName] = existingSummary || "Section summary unavailable."
        continue
      }

      // Add to processed set before API call to prevent parallel calls for similar content
      processedSections.add(sectionHash)

      try {
        // Summarize the section text with retry logic
        const summary = await summarizeText(sectionText)
        summaries[sectionName] = summary
      } catch (error) {
        console.error(`Error summarizing ${sectionName}:`, error)
        summaries[sectionName] = `Could not summarize ${sectionName} due to an error.`
      }

      // Add a delay between API calls to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    // Store paper data
    paperStorage.set(paperId, {
      text: pdfText,
      sections,
      summaries,
      chatHistory: [],
    })

    // Initialize chat history
    await saveChat(paperId, [])

    return NextResponse.json({
      success: true,
      paperId,
      summaries,
    })
  } catch (error) {
    console.error("Error processing PDF:", error)
    return NextResponse.json({ error: "Failed to process the PDF file" }, { status: 500 })
  }
}

// Export for use in other routes
export { paperStorage }
