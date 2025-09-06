export async function compareDocuments(document1: string, document2: string): Promise<any> {
  const ollamaUrl = import.meta.env.OLLAMA_URL || "http://localhost:11434";
  const res = await fetch(`${ollamaUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gemma3-legal:latest",
      prompt: `Compare the two legal documents and provide differences, risks, and recommendations.\n\nDocument 1:\n${document1.substring(0, 2000)}\n\nDocument 2:\n${document2.substring(0, 2000)}`,
      options: { temperature: 0.2, num_predict: 2000 },
    }),
  });
  const data = await res.json();
  return data.response;
}
