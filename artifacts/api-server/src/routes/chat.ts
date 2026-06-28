import { Router } from "express";
import { GoogleGenAI } from "@google/genai";

const router = Router();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
  images?: string[];
}

router.post("/stream", async (req, res) => {
  const { message, history = [], model = "gemini-2.5-flash", images = [] } = req.body as {
    message: string;
    history: HistoryMessage[];
    model: string;
    images?: string[];
  };

  if (!message && (!images || images.length === 0)) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const allowedModels = ["gemini-2.5-flash", "gemini-2.5-pro"];
  const safeModel = allowedModels.includes(model) ? model : "gemini-2.5-flash";

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const historyContents = history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user" as const,
      parts: [{ text: m.content }],
    }));

    // Build current message parts (text + optional images)
    const currentParts: any[] = [];

    // Add base64 images if provided
    if (images && images.length > 0) {
      for (const imgData of images) {
        // imgData is base64 string with optional data URI prefix
        const base64 = imgData.includes(",") ? imgData.split(",")[1] : imgData;
        const mimeType = imgData.startsWith("data:image/png") ? "image/png" : "image/jpeg";
        currentParts.push({
          inlineData: { mimeType, data: base64 },
        });
      }
    }

    if (message) {
      currentParts.push({ text: message });
    }

    const contents = [
      ...historyContents,
      { role: "user" as const, parts: currentParts },
    ];

    const stream = await ai.models.generateContentStream({
      model: safeModel,
      contents,
      config: {
        maxOutputTokens: 8192,
        systemInstruction:
          "Eres Spark, un asistente de inteligencia artificial avanzado. Responde siempre en español a menos que el usuario escriba en otro idioma. Sé útil, preciso y amigable. Cuando el usuario comparta imágenes, analízalas y describe su contenido de forma detallada.",
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (err: any) {
    req.log.error({ err }, "Gemini stream error");
    res.write(
      `data: ${JSON.stringify({ error: "Error al conectar con la IA" })}\n\n`
    );
    res.end();
  }
});

export default router;
