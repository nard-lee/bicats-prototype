import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import fs from "node:fs";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import pino from "pino";
import cors from "cors";
import { pinoHttp } from "pino-http";
import { ZodError } from "zod";
import { CustomError } from "@/utils/custom.exception.js";

import routes from "./routes.js";

import { config } from "@/utils/env.config.js";
import {
  getStoredObject,
  storageEnabled,
  STORED_KEY_PATTERN,
} from "@/utils/storage.js";
import { doubleCsrfProtection, ensureCsrfSession, generateCsrfToken } from "@/utils/csrf.js";
import path from "path";
import { fileURLToPath } from "url";
import type { Readable } from "node:stream";

const isProd = config.nodeEnv === "production";
const isTest = config.nodeEnv === "test";

// Public pages load AdSense, so its loader, frames, and beacons need explicit
// allow-listing; Helmet otherwise blocks them with script-src 'self'.
const ADS_DOMAINS = [
  "https://pagead2.googlesyndication.com",
  "https://*.googlesyndication.com",
  "https://*.doubleclick.net",
  "https://*.google.com",
  "https://*.googleadservices.com",
  "https://*.gstatic.com",
  "https://*.adtrafficquality.google",
];

const logger = pino({
  level: isTest ? "silent" : isProd ? "info" : "debug",
  ...(!isProd && !isTest && {
    transport: {
      target: "pino-pretty",
    },
  }),
  redact: [
    "req.headers.cookie",
    "req.headers.authorization",
    'res.headers["set-cookie"]',
  ],
});

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(
  "/uploads",
  express.static(path.resolve(__dirname, "../uploads"), {
    // Uploaded names are UUIDs, so a given URL never changes content.
    maxAge: "30d",
    immutable: true,
  }),
);

if (config.nodeEnv === "production") app.set("trust proxy", 1);

// ---- Middleware (order matters) ----
app.use(pinoHttp({ logger }));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "script-src": ["'self'", ...ADS_DOMAINS],
        "frame-src": ["'self'", ...ADS_DOMAINS],
        "img-src": ["'self'", "data:", ...ADS_DOMAINS],
        "connect-src": ["'self'", ...ADS_DOMAINS],
      },
    },
  })
);
app.use(compression());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

// Side-effect-free ping for hosts and uptime checks (no session cookies).
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

// Stream privately-stored bucket objects. Keys are random UUIDs whose content
// never changes, so responses are immutable and cacheable. The same security
// posture as the local /uploads folder: unguessable names, no enumeration.
if (storageEnabled()) {
  app.get("/api/assets/:key", async (req: Request, res: Response) => {
    const key = req.params.key;
    if (typeof key !== "string" || !STORED_KEY_PATTERN.test(key)) {
      res.status(404).json({ message: "Not found" });
      return;
    }
    const object = await getStoredObject(key);
    const body = object?.Body as Readable | undefined;
    if (!object || !body) {
      res.status(404).json({ message: "Not found" });
      return;
    }
    if (object.ContentType) res.type(object.ContentType);
    if (object.ETag) res.setHeader("ETag", object.ETag);
    if (object.ContentLength !== undefined) {
      res.setHeader("Content-Length", String(object.ContentLength));
    }
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    body.pipe(res);
  });
}

app.use(ensureCsrfSession);
app.get("/api/csrf-token", (req: Request, res: Response) => {
  res.json({ csrfToken: generateCsrfToken(req, res) });
});
app.use(doubleCsrfProtection);

// ---- Routes ----
app.use(routes);

// ---- Unknown API route ----
app.use("/api", (_req, res) => {
  res.status(404).json({ message: "Not found" });
});

// ---- Single-service deploys: serve the built client from the API origin ----
const clientDist = path.resolve(__dirname, "../../client/dist");
if (isProd && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { index: false, maxAge: "1h" }));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" || req.path.startsWith("/uploads")) return next();
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof CustomError) {
    return res.status(err.statusCode).json({
      message: err.message,
      fields: err.fields,
    });
  }

  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.length ? issue.path.join(".") : "_root";
      fields[key] ??= issue.message;
    }
    return res.status(400).json({ message: "Validation failed", fields });
  }

  // Middleware and multer reject with ApiError, which carries its own status.
  const status = (err as { statusCode?: number })?.statusCode;
  if (typeof status === "number" && status < 500) {
    return res.status(status).json({ message: (err as Error).message });
  }

  req.log.error(err);
  res.status(500).json({ message: "Something went wrong" });
});

export default app;
