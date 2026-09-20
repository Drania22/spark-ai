import { Router } from "express";
import { getAuth } from "@clerk/express";
import Anthropic from "@anthropic-ai/sdk";

const router = Router();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const ALLOWED_MODELS = [DEFAULT_MODEL, "claude-sonnet-5"];
const MAX_HISTORY = 40;
const MAX_IMAGES = 4;
const MAX_TEXT_CHARS = 20_000;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

const SYSTEM_PROMPT =
  "Eres Spark, un asistente de inteligencia artificial avanzado. Responde siempre en español a menos que el usuario escriba en otro idioma. Sé útil, preciso y amigable. Cuando el usuario comparta imágenes, analízalas y describe su contenido de forma detallada.";

function parseImage(data: string) {
  const match = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(data);
  if (!match) return null;
  const mediaType = match[1].toLowerCase() as ImageType;
  if (!IMAGE_TYPES.includes(mediaType)) return null;
  return { mediaType, data: match[2] };
}

router.post("/stream", async (req, res) => {
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

  // Claude rechaza mensajes vacíos, así que se descartan los turnos sin texto
  // (p. ej. respuestas que fallaron a mitad de stream).
  const historyMessages: Anthropic.MessageParam[] = history
    .slice(-MAX_HISTORY)
    .filter(
      (m) =>
        (m?.role === "user" || m?.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim() !== "",
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_TEXT_CHARS) }));

  const currentContent: Anthropic.ContentBlockParam[] = [];
  for (const img of images) {
    const parsed = typeof img === "string" ? parseImage(img) : null;
    if (!parsed) {
      res.status(400).json({ error: "imagen inválida" });
      return;
    }
    currentContent.push({
      type: "image",
      source: { type: "base64", media_type: parsed.mediaType, data: parsed.data },
    });
  }
  if (message) currentContent.push({ type: "text", text: message });

  // La API exige que el primer mensaje sea de usuario y que los roles alternen.
  const messages: Anthropic.MessageParam[] = [];
  for (const m of [...historyMessages, { role: "user" as const, content: currentContent }]) {
    const last = messages[messages.length - 1];
    if (last && last.role === m.role && typeof last.content === "string" && typeof m.content === "string") {
      last.content += `\n\n${m.content}`;
    } else if (messages.length === 0 && m.role !== "user") {
      continue;
    } else {
      messages.push(m);
    }
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const controller = new AbortController();
  res.on("close", () => controller.abort());

  try {
    const stream = anthropic.messages.stream(
      {
        model: safeModel,
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages,
      },
      { signal: controller.signal },
    );

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (err: any) {
    if (controller.signal.aborted) return;
    req.log.error({ err }, "Claude stream error");
    res.write(`data: ${JSON.stringify({ error: "Error al conectar con la IA" })}\n\n`);
    res.end();
  }
});

export default router;
