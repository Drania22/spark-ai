import { Router } from "express";
import { getAuth } from "@clerk/express";
import { GoogleGenAI } from "@google/genai";
import { envInt, rateLimitByUser } from "../lib/rateLimit";

const router = Router();

// Mensajes por usuario y hora (configurable con CHAT_RATE_LIMIT_PER_HOUR).
const chatLimiter = rateLimitByUser({
  max: envInt("CHAT_RATE_LIMIT_PER_HOUR", 30),
  windowMs: 60 * 60 * 1000,
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

const DEFAULT_MODEL = "gemini-2.5-flash";
const ALLOWED_MODELS = [DEFAULT_MODEL, "gemini-2.5-pro"];
const MAX_HISTORY = 40;
const MAX_IMAGES = 4;
const MAX_TEXT_CHARS = 20_000;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

const SYSTEM_PROMPT =
  "Eres Spark, un asistente de inteligencia artificial avanzado. Responde siempre en español a menos que el usuario escriba en otro idioma. Sé útil, preciso y amigable. Cuando el usuario comparta imágenes, analízalas y describe su contenido de forma detallada.";

function parseImage(data: string) {
  const match = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(data);
  if (!match) return null;
  const mimeType = match[1].toLowerCase();
  if (!IMAGE_TYPES.includes(mimeType)) return null;
  return { mimeType, data: match[2] };
}

router.post("/stream", chatLimiter, async (req, res) => {
  if (!getAuth(req).userId) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const {
    message = "",
    history = [],
    model = DEFAULT_MODEL,
    images = [],
  } = (req.body ?? {}) as {
    message?: string;
    history?: HistoryMessage[];
    model?: string;
    images?: string[];
  };

  if (
    typeof message !== "string" ||
    message.length > MAX_TEXT_CHARS ||
    !Array.isArray(history) ||
    !Array.isArray(images) ||
    images.length > MAX_IMAGES
  ) {
    res.status(400).json({ error: "solicitud inválida" });
    return;
  }

  if (!message && images.length === 0) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const safeModel = ALLOWED_MODELS.includes(model) ? model : DEFAULT_MODEL;

  // Gemini rechaza partes de texto vacías, así que se descartan los turnos sin
  // texto (p. ej. respuestas que fallaron a mitad de stream).
  const historyContents = history
    .slice(-MAX_HISTORY)
    .filter(
      (m) =>
        (m?.role === "user" || m?.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim() !== "",
    )
    .map((m) => ({
      role: m.role === "assistant" ? "model" : ("user" as const),
      parts: [{ text: m.content.slice(0, MAX_TEXT_CHARS) }],
    }));

  const currentParts: any[] = [];
  for (const img of images) {
    const parsed = typeof img === "string" ? parseImage(img) : null;
    if (!parsed) {
      res.status(400).json({ error: "imagen inválida" });
      return;
    }
    currentParts.push({ inlineData: parsed });
  }
  if (message) currentParts.push({ text: message });

  // Gemini exige que el primer turno sea de usuario.
  while (historyContents.length > 0 && historyContents[0].role !== "user") {
    historyContents.shift();
  }

  const contents = [
    ...historyContents,
    { role: "user" as const, parts: currentParts },
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const controller = new AbortController();
  res.on("close", () => controller.abort());

  try {
    const stream = await ai.models.generateContentStream({
      model: safeModel,
      contents,
      config: {
        maxOutputTokens: 8192,
        systemInstruction: SYSTEM_PROMPT,
        abortSignal: controller.signal,
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
    if (controller.signal.aborted) return;
    req.log.error({ err }, "Gemini stream error");
    res.write(
      `data: ${JSON.stringify({ error: "Error al conectar con la IA" })}\n\n`,
    );
    res.end();
  }
});

export default router;
