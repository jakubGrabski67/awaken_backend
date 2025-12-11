import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { api } from "@/routes";
import { errorMiddleware } from "@/middlewares/error.middleware";
import { mountSwagger } from "./docs/swagger";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  // security + CORS
  app.use(helmet());
  app.use(
    cors({
      origin: [
        /\.vercel\.app$/,
        "http://localhost:3000",
      ],
      credentials: true,
    })
  );

  // parsers
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // rate limiting
  app.use(
    rateLimit({
      windowMs: 60_000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  // dokumentacja Swagger
  mountSwagger(app);
  app.get("/openapi.yaml", (_req, res) =>
    res.sendFile(path.resolve(process.cwd(), "openapi.yaml"))
  );

  app.use("/api", api);
  app.use("/", api); // kompatybilność wsteczna

  // 404
  app.use((req, _res, next) => {
    const err: any = new Error(`Not Found: ${req.method} ${req.originalUrl}`);
    err.status = 404;
    next(err);
  });

  // globalny handler błędów
  app.use(
    (
      err: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      if (err?.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "Payload Too Large" });
      }
      return errorMiddleware(err, _req, res, _next);
    }
  );

  return app;
}
