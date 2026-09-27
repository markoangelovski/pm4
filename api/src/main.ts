import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { AppConfigService } from './config/app-config.service.js';
import { buildOpenApiDocument, setupSwagger } from './openapi.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);

  const configService = app.get(AppConfigService);

  if (!configService.isProduction) {
    setupSwagger(app, buildOpenApiDocument(app));
  }

  await app.listen(configService.port, '0.0.0.0');
}

bootstrap().catch((error: unknown) => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
