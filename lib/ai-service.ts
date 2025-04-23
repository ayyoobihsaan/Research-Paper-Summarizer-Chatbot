import { GoogleGenerativeAI } from "@google/generative-ai"

// Initialize the Google AI client
const getGoogleAI = () => {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GOOGLE_GEMINI_API_KEY is not set in environment variables")
  }
  return new GoogleGenerativeAI(apiKey)
}

/**
 * Summarize text using Google Gemini AI
 */
async function summarizeText(text: string): Promise<string> {
  try {
    // Truncate text if it's too long (Gemini has different token limits than OpenAI)
    const truncatedText = text.length > 30000 ? text.substring(0, 30000) + "..." : text

    // Add exponential backoff retry logic
    const maxRetries = 5
    let retryCount = 0

    while (retryCount < maxRetries) {
      try {
        const genAI = getGoogleAI()
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" })

        const prompt = `You are a research assistant that creates clear, accurate summaries of academic text.
        
        Summarize the following text in a concise paragraph:
        
        ${truncatedText}`

        const result = await model.generateContent(prompt)
        const response = result.response
        const summary = response.text()

        return summary
      } catch (error) {
        console.error(`Attempt ${retryCount + 1} failed:`, error)

        // Check if it's a rate limit error
        const isRateLimit =
          error.toString().includes("RESOURCE_EXHAUSTED") ||
          error.toString().includes("rate limit") ||
          error.toString().includes("quota")

        if (isRateLimit && retryCount < maxRetries - 1) {
          // Calculate exponential backoff time (1s, 2s, 4s, 8s, 16s)
          const backoffTime = Math.pow(2, retryCount) * 1000
          console.log(`Rate limit hit. Retrying in ${backoffTime / 1000}s...`)

          // Wait for the backoff period
          await new Promise((resolve) => setTimeout(resolve, backoffTime))
          retryCount++
        } else {
          // If it's not a rate limit error or we've reached max retries, throw
          throw error
        }
      }
    }

    // If we've exhausted retries, use a fallback
    console.error("Max retries reached for AI summarization. Using fallback.")
    return "Summary unavailable due to API rate limits. Please try again later."
  } catch (error) {
    console.error("Error summarizing text:", error)
    return "Unable to generate summary due to an error."
  }
}

/**
 * Answer a question about the paper using Google Gemini
 */
async function answerQuestion(
  question: string,
  fullText: string,
  sections: Record<string, string>,
  summaries: Record<string, string>,
  chatHistory: Array<{ role: string; content: string }>,
): Promise<string> {
  try {
    // Create a context from the paper content
    // We'll use summaries to keep the context smaller
    let context = "Paper summaries:\n"

    for (const [section, summary] of Object.entries(summaries)) {
      context += `${section.toUpperCase()}: ${summary}\n\n`
    }

    // Get the last few messages from chat history for context
    const recentMessages = chatHistory.slice(-4)
    let conversationContext = ""

    if (recentMessages.length > 0) {
      conversationContext =
        "Recent conversation:\n" +
        recentMessages.map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`).join("\n") +
        "\n\n"
    }

    // Add exponential backoff retry logic
    const maxRetries = 5
    let retryCount = 0

    while (retryCount < maxRetries) {
      try {
        const genAI = getGoogleAI()
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" })

        const prompt = `You are a research assistant helping with questions about an academic paper.
        
        Here is information about the paper:
        
        ${context}
        
        ${conversationContext}
        
        User question: ${question}
        
        Answer the user's question based on the paper content. If the information is not in the paper, 
        say that you don't have that information rather than making up an answer.`

        const result = await model.generateContent(prompt)
        const response = result.response
        const answer = response.text()

        return answer
      } catch (error) {
        console.error(`Attempt ${retryCount + 1} failed:`, error)

        // Check if it's a rate limit error
        const isRateLimit =
          error.toString().includes("RESOURCE_EXHAUSTED") ||
          error.toString().includes("rate limit") ||
          error.toString().includes("quota")

        if (isRateLimit && retryCount < maxRetries - 1) {
          // Calculate exponential backoff time (1s, 2s, 4s, 8s, 16s)
          const backoffTime = Math.pow(2, retryCount) * 1000
          console.log(`Rate limit hit. Retrying in ${backoffTime / 1000}s...`)

          // Wait for the backoff period
          await new Promise((resolve) => setTimeout(resolve, backoffTime))
          retryCount++
        } else {
          // If it's not a rate limit error or we've reached max retries, throw
          throw error
        }
      }
    }

    // If we've exhausted retries, use a fallback
    console.error("Max retries reached for AI Q&A. Using fallback.")
    return "I'm sorry, I couldn't process your question due to API rate limits. Please try again in a minute."
  } catch (error) {
    console.error("Error answering question:", error)
    return "I'm sorry, I encountered an error while processing your question. Please try again."
  }
}

export { summarizeText, answerQuestion }
