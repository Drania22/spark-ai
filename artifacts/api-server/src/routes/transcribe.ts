import { Router } from "express";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";

const router = Router();
const upload = multer({ dest: "/tmp/spark-audio/" });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });

router.post("/", upload.single("audio"), async (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "No audio file provided" });
    return;
  }

  try {
    // Read the audio file as base64
    const audioData = fs.readFileSync(file.path).toString("base64");
    const mimeType = (file.mimetype as "audio/m4a") || "audio/m4a";

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioData,
              },
            },
            {
              text: "Transcribe the audio exactly as spoken. Return ONLY the transcribed text, nothing else. If the audio is in Spanish, return it in Spanish.",
            },
          ],
        },
      ],
    });

    const text = response.text ?? "";
    res.json({ text });
  } catch (err: any) {
    req.log.error({ err }, "Transcription error");
    res.status(500).json({ error: "Transcription failed" });
  } finally {
    // Clean up temp file
    if (file?.path) {
      fs.unlink(file.path, () => {});
    }
  }
});

export default router;
