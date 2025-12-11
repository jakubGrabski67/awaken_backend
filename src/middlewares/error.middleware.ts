import type { ErrorRequestHandler } from "express";

export const errorMiddleware: ErrorRequestHandler = (err: any, req, res, _next) => {
  if (err?.type === "entity.parse.failed") {
    if (!res.headersSent) {
      return res.status(400).json({ error: "Invalid JSON payload" });
    }
    return;
  }

  const status = Number(err?.status ?? 500);
  const payload: Record<string, any> = {
    error: err?.message ?? "Internal Server Error",
  };

  if (err?.details) {
    payload.details = err.details;
  }

  if (process.env.NODE_ENV !== "production") {
    if (err?.cause) payload.cause = String(err.cause);
    if (err?.stack) payload.stack = err.stack;
  }

  if (!res.headersSent) {
    res.status(status).json(payload);
  }
};
