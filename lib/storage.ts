// In-memory storage for chat history
// In a production app, use a database
const chatStorage = new Map<string, Array<{ role: string; content: string }>>()

/**
 * Save chat history for a paper
 */
export async function saveChat(paperId: string, chatHistory: Array<{ role: string; content: string }>): Promise<void> {
  chatStorage.set(paperId, [...chatHistory])
}

/**
 * Get chat history for a paper
 */
export async function getChat(paperId: string): Promise<Array<{ role: string; content: string }>> {
  return chatStorage.get(paperId) || []
}

/**
 * Delete chat history for a paper
 */
export async function deleteChat(paperId: string): Promise<void> {
  chatStorage.delete(paperId)
}
