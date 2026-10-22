import app from "@/app.js";

import { startReminderJob } from "@/jobs/reminder.job.js";
import { config } from "@/utils/env.config.js";
import { connectDatabase, prisma } from "@/db.js";

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
