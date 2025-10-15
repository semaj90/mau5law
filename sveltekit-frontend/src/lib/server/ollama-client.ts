import fetch from 'node-fetch'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'

export const ollamaClient = {
  async embedText(text: string): Promise<number[] | null> {
    try {
      const url = `${OLLAMA_URL}/embed` // hypothetical embed endpoint
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'gemma3-legal', input: text }),
      })

      if (!res.ok) {
        console.warn('Ollama embed request failed', res.status)
        return null
      }

      const data = await res.json()
      // Expect { embedding: number[] }
      return Array.isArray(data?.embedding) ? data.embedding : null
    } catch (err) {
      console.warn('ollamaClient.embedText error', err)
      return null
    }
  },
}
