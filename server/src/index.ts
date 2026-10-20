import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import pino from "pino";
import cors from 'cors';
import { pinoHttp } from "pino-http";
import { ZodError } from "zod";
import { CustomError } from "@/utils/custom.exception.js";

import authRouter from "@/modules/auth/auth.routes.js";
import userRouter from "@/modules/user/user.routes.js";
import complaintRouter from "@/modules/complaint/complaint.routes.js"
import noticeRouter from "@/modules/notice/notice.routes.js"
import analyticsRouter from "@/modules/analytics/analytics.routes.js"
import notificationRouter from "@/modules/notification/notification.routes.js"
import hearingRouter from "@/modules/hearing/hearing.routes.js"
import auditRouter from "@/modules/audit/audit.routes.js"
import settingRouter from "@/modules/setting/setting.routes.js"
import { startReminderJob } from "@/jobs/reminder.job.js"


import { config } from "@/utils/env.config.js";
import { doubleCsrfProtection, ensureCsrfSession, generateCsrfToken } from "@/utils/csrf.js";
import { connectDatabase, prisma } from "@/db.js";
import path from "path";
import { fileURLToPath } from "url";

const isProd = config.nodeEnv === "production";
const port = Number(process.env.PORT ?? 3000);

const logger = pino({
  level: isProd ? "info" : "debug",
  ...(!isProd && {
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
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));


if (config.nodeEnv === 'production') app.set('trust proxy', 1);

// ---- Middleware (order matters) ----
app.use(pinoHttp({ logger }));
app.use(helmet());
app.use(compression());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.use(ensureCsrfSession);
app.get('/api/csrf-token', (req: Request, res: Response) => {
  res.json({ csrfToken: generateCsrfToken(req, res) });
});
app.use(doubleCsrfProtection);

// ---- Routes ----

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/complaints', complaintRouter);
app.use('/api/notices', noticeRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/hearings', hearingRouter);
app.use('/api/audit', auditRouter);
app.use('/api/settings', settingRouter);

// ---- Unknown API route ----
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof CustomError) {
    return res.status(err.statusCode).json({
      message: err.message,
      fields: err.fields,
    });
  }

  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) fields[issue.path.join(".")] ??= issue.message;
    return res.status(400).json({ message: "Validation failed", fields });
  }

  // ADD THIS BLOCK
  const status = (err as { statusCode?: number })?.statusCode;
  if (typeof status === "number" && status < 500) {
    return res.status(status).json({ message: (err as Error).message });
  }

  req.log.error(err);
  res.status(500).json({ message: "Something went wrong" });
});


async function start() {
  try {
    await connectDatabase();
    console.log("==> database: connected");
  } catch (err) {
    console.error('==> database: connection failed', err);
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    console.log(`==> server: http://localhost:${config.port}`);
  });

  startReminderJob();

  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  process.on('SIGTERM', () => {
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  });
}

start();
