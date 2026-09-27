import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import packageJson from '../package.json' with { type: 'json' };

/**
 * Builds the OpenAPI document (ADR-0010). Shared by `/docs` (main.ts, non-prod
 * only) and `scripts/export-openapi.ts` (`api/openapi.json`, committed).
 */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('PM4 API')
    .setDescription('The PM4 backend API (see ../specs/03-api).')
    .setVersion(packageJson.version)
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearer',
    )
    .build();

  return SwaggerModule.createDocument(app, config);
}

export function setupSwagger(
  app: INestApplication,
  document: OpenAPIObject,
): void {
  SwaggerModule.setup('docs', app, document);
}
