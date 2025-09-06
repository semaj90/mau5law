export async function runCustomAnalysis(content: string, prompt: string): Promise<any> {
  const ollamaUrl = import.meta.env.OLLAMA_URL || "http://localhost:11434";
  const res = await fetch(`${ollamaUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gemma3-legal:latest",
      prompt: `${prompt}\n\nDocument content: ${content.substring(0, 4000)}`,
      options: { temperature: 0.2, num_predict: 2000 },
    }),
  });
  const data = await res.json();
  return data.response;
}
