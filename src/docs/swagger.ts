import path from "node:path";
import fs from "node:fs";
import YAML from "yaml";
import swaggerUi from "swagger-ui-express";
import type { Express } from "express";

export function mountSwagger(app: Express) {
  const specPath = path.resolve(process.cwd(), "openapi.yaml");
  const spec = YAML.parse(fs.readFileSync(specPath, "utf8"));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));
}
