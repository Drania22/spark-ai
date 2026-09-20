import { Router } from "express";
import { getAuth } from "@clerk/express";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const router = Router();

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const AUDIO_TYPES = ["audio/m4a", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/mpeg", "audio/wav", "audio/webm", "audio/ogg"];

const upload = multer({
  dest: path.join(os.tmpdir(), "spark-audio"),
  limits: { fileSize: MAX_AUDIO_BYTES, files: 1 },
});
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });

// La autenticación va antes de multer para no escribir a disco archivos de
// usuarios no autenticados.
router.post(
  "/",
  (req, res, next) => {
    if (!getAuth(req).userId) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }
    next();
  },
  (req, res, next) => {
    upload.single("audio")(req, res, (err) => {
      if (err) {
        res.status(err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: "audio inválido" });
        return;
      }
      next();
    });
  },
  async (req, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No audio file provided" });
      return;
    }

    try {
      if (!AUDIO_TYPES.includes(file.mimetype)) {
        res.status(400).json({ error: "tipo de audio no soportado" });
        return;
      }

      const audioData = (await fs.promises.readFile(file.path)).toString("base64");

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: file.mimetype, data: audioData } },
              {
                text: "Transcribe the audio exactly as spoken. Return ONLY the transcribed text, nothing else. If the audio is in Spanish, return it in Spanish.",
              },
            ],
          },
        ],
      });

      res.json({ text: response.text ?? "" });
    } catch (err: any) {
      req.log.error({ err }, "Transcription error");
      res.status(500).json({ error: "Transcription failed" });
    } finally {
      fs.unlink(file.path, () => {});
    }
  },
);

export default router;
