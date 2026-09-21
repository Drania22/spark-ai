import { getAuth } from "@clerk/express";
import type { RequestHandler } from "express";

/**
 * Límite de solicitudes por usuario (ventana deslizante en memoria).
 *
 * Protege la cuota de la API de Gemini de un uso excesivo. Los contadores viven
 * en el proceso: se reinician al reiniciar el servidor y no se comparten entre
 * varias instancias (para eso haría falta Redis u otro almacén compartido).
 */
export function rateLimitByUser(options: {
  max: number;
  windowMs: number;
}): RequestHandler {
  const hits = new Map<string, number[]>();

  // Limpieza periódica para que el mapa no crezca sin límite.
  const cleanup = setInterval(() => {
    const cutoff = Date.now() - options.windowMs;
    for (const [user, times] of hits) {
      const recent = times.filter((t) => t > cutoff);
      if (recent.length === 0) hits.delete(user);
      else hits.set(user, recent);
    }
  }, Math.min(options.windowMs, 60_000));
  cleanup.unref();

  return (req, res, next) => {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }

    const now = Date.now();
    const recent = (hits.get(userId) ?? []).filter(
      (t) => t > now - options.windowMs,
    );

    if (recent.length >= options.max) {
      const retryAfter = Math.ceil((recent[0] + options.windowMs - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ error: "Demasiadas solicitudes", retryAfter });
      return;
    }

    recent.push(now);
    hits.set(userId, recent);
    next();
  };
}

export function envInt(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
