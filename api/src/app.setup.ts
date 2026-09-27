import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppConfigService } from './config/app-config.service.js';
import { ProblemDetailsFilter } from './common/filters/problem-details/problem-details.filter.js';
import { flattenValidationErrors } from './common/validation/flatten-validation-errors.js';

/**
 * Bootstrap shared by `main.ts` and every e2e test (`test/*.e2e-spec.ts`), so
 * both run against the exact same hardening/middleware stack.
 */
export function configureApp(app: NestExpressApplication): void {
  const configService = app.get(AppConfigService);

  app.setGlobalPrefix('api/v1', { exclude: ['health'] });

  app.use(helmet());
  app.useBodyParser('json', { limit: '100kb' });

  app.enableCors({
    origin: configService.corsOrigins,
    credentials: false,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({ errors: flattenValidationErrors(errors) }),
    }),
  );

  app.useGlobalFilters(app.get(ProblemDetailsFilter));

  app.enableShutdownHooks();
}
