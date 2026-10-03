import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/app.setup.js";
import { buildOpenApiDocument } from "../src/openapi.js";

/**
 * Writes `api/openapi.json` (committed, ADR-0010) without starting an HTTP
 * listener. Run via `npm run openapi:export` (builds first, then runs this
 * compiled script with `.env.example` supplying the env it needs to boot).
 */
async function main(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: false
  });
  configureApp(app);
  const document = buildOpenApiDocument(app);

  const outputPath = resolve(import.meta.dirname, "../../openapi.json");
  writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`);

  await app.close();

  console.log(`Wrote ${outputPath}`);
}

main().catch((error: unknown) => {
  console.error("Failed to export the OpenAPI document:", error);
  process.exit(1);
});
