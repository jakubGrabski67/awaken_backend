import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { validate } from "@/middlewares/validate.middleware";
import { exportBodySchema } from "@/schemas/files.schema";
import { translateBodySchema, translateBatchBodySchema } from "@/schemas/translate.schema";
import { uploadFile, getSegments, exportFile } from "@/controllers/files.controller";
import { translateOne, translateBatch } from "@/controllers/translate.controller";

// Multer: memory storage + limity + wczesna walidacja typu pliku
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const okExt = /\.idml$/i.test(file.originalname) || /\.zip$/i.test(file.originalname);
    const okMime =
      (file.mimetype || "").includes("zip") || file.mimetype === "application/octet-stream";
    if (okExt || okMime) return cb(null, true);
    const err: any = new Error("Unsupported file type");
    err.status = 415;
    return cb(err);
  },
});

// Prosta walidacja paramów
const fileIdParamSchema = z.object({
  fileId: z.string().min(1, "fileId is required"),
});

export const api = Router();

// health
api.get("/healthz", (_req, res) => res.json({ ok: true }));
api.head("/healthz", (_req, res) => res.status(200).end());

// files
api.post("/files/upload", upload.single("file"), uploadFile);

api.get("/files/:fileId/segments", validate(fileIdParamSchema, "params"), getSegments);

api.post(
  "/files/:fileId/export",
  validate(fileIdParamSchema, "params"),
  validate(exportBodySchema),
  exportFile
);

// translate
api.post("/translate", validate(translateBodySchema), translateOne);
api.post("/translate/batch", validate(translateBatchBodySchema), translateBatch);
