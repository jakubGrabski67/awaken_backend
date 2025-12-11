import http from "node:http";
import { createApp } from "./app";

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

(async () => {
  // eslint-disable-next-line no-console
  console.log(
    "[boot] starting… node=%s env=%s",
    process.version,
    process.env.NODE_ENV ?? "dev"
  );
  // eslint-disable-next-line no-console
  console.log("[boot] listen on http://%s:%d", host, port);

  try {
    const app = createApp();
    const server = http.createServer(app);

    server.listen(port, host, () => {
      // eslint-disable-next-line no-console
      console.log(`[boot] API on http://${host}:${port}`);
    });

    const shutdown = (signal: string) => {
      // eslint-disable-next-line no-console
      console.log(`[boot] ${signal} received, shutting down…`);
      server.close(() => {
        // eslint-disable-next-line no-console
        console.log("[boot] server closed");
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10_000).unref();
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[boot] failed:", err);
    process.exit(1);
  }
})();
