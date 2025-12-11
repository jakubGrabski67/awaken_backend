import { RequestHandler } from "express";
import crypto from "node:crypto";
import { putFile, getFile } from "@/storage/memory.storage";
import { listSegments, replaceSegments, enumerateIdmlsFromZipContainer } from "@/services/idml.service";
import type { ExportBody } from "@/schemas/files.schema";

export const uploadFile: RequestHandler = (req, res, next) => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return next(Object.assign(new Error("No file"), { status: 400 }));

    const isIdml = /\.idml$/i.test(file.originalname);
    const isZip = /\.zip$/i.test(file.originalname);
    if (!isIdml && !isZip) {
      return next(Object.assign(new Error("Unsupported file type"), { status: 415 }));
    }

    const idmls = enumerateIdmlsFromZipContainer(file.buffer, { requireAtLeastOne: true });

    if (idmls.length === 1) {
      // tryb single
      const id = crypto.randomUUID();

      const single = idmls[0];
      const name =
        isIdml
          ? file.originalname
          : (single.name || file.originalname);

      putFile(id, single.buf, name);

      const segments = listSegments(single.buf);
      res.json({ fileId: id, originalName: name, segments });
      return;
    }

    // tryb multi – każdy IDML jako oddzielny fileId
    const files = idmls.map(({ name, buf }) => {
      const id = crypto.randomUUID();
      putFile(id, buf, name);
      const segments = listSegments(buf);
      return { fileId: id, name, segments };
    });

    // zwracamy nazwę ZIP'a + listę IDML'i
    res.json({ originalName: file.originalname, files });
  } catch (e) {
    next(e);
  }
};

export const getSegments: RequestHandler = (req, res, next) => {
  try {
    const id = req.params.fileId!;
    const { buf, name } = getFile(id);
    const segments = listSegments(buf);
    res.json({ fileId: id, originalName: name, segments });
  } catch (e) {
    next(e);
  }
};

export const exportFile: RequestHandler = (req, res, next) => {
  try {
    const id = req.params.fileId!;
    const { buf, name } = getFile(id);
    const body = req.body as ExportBody;

    const out = replaceSegments(buf, body.replacements);
    res
      .setHeader("Content-Type", "application/zip")
      .setHeader(
        "Content-Disposition",
        `attachment; filename="${name.replace(/\.idml$/i, "")}.idml"`
      )
      .send(out);
  } catch (e) {
    next(e);
  }
};
