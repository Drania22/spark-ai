import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// Solo se aceptan orígenes propios. Las apps nativas no envían Origin, así que
// solo afecta al navegador. Configura ALLOWED_ORIGINS con URLs completas
// separadas por comas (p. ej. "https://mi-dominio.com,https://www.mi-dominio.com").
const allowedOrigins = new Set([
  ...(process.env.ALLOWED_ORIGINS ?? "").split(","),
  ...[process.env.REPLIT_DEV_DOMAIN, ...(process.env.REPLIT_DOMAINS ?? "").split(",")]
    .filter(Boolean)
    .map((d) => `https://${d!.trim()}`),
].map((o) => o.trim().replace(/\/$/, "")).filter(Boolean));

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)),
  }),
);
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

export default app;
