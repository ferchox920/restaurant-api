import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { setupSwagger } from './config/swagger.config';

export function resolveCorsOrigins(
  rawCorsOrigin: string | undefined,
): true | string[] {
  if (!rawCorsOrigin || rawCorsOrigin.trim().length === 0) {
    return true;
  }

  if (rawCorsOrigin.trim() === '*') {
    return true;
  }

  return rawCorsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function validateProductionCors(
  nodeEnv: string,
  corsEnabled: boolean,
  corsOrigin: string | undefined,
): void {
  const normalizedCorsOrigin = corsOrigin?.trim();

  if (
    corsEnabled &&
    nodeEnv === 'production' &&
    (!normalizedCorsOrigin || normalizedCorsOrigin === '*')
  ) {
    throw new Error(
      'CORS_ORIGIN must be a specific origin when CORS_ENABLED=true in production.',
    );
  }
}

export function shouldEnableCors(
  nodeEnv: string,
  corsEnabled: boolean,
): boolean {
  return nodeEnv === 'production' ? corsEnabled : true;
}

export async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: 'health/readiness', method: RequestMethod.GET },
    ],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.use(helmet());
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  const configService = app.get(ConfigService);
  const nodeEnv = configService.getOrThrow<string>('NODE_ENV');
  const trustProxyHops = configService.get<number>('TRUST_PROXY_HOPS') ?? 0;

  if (trustProxyHops > 0) {
    app.getHttpAdapter().getInstance().set('trust proxy', trustProxyHops);
  }

  const corsEnabled = configService.get<boolean>('CORS_ENABLED') ?? false;
  const corsOrigin = configService.get<string>('CORS_ORIGIN');

  if (shouldEnableCors(nodeEnv, corsEnabled)) {
    const normalizedCorsOrigin = corsOrigin?.trim();
    validateProductionCors(nodeEnv, corsEnabled, normalizedCorsOrigin);

    app.enableCors({
      origin: resolveCorsOrigins(normalizedCorsOrigin),
    });
  }

  const swaggerEnabled = configService.get<boolean>('SWAGGER_ENABLED') ?? false;

  if (swaggerEnabled) {
    setupSwagger(app);
  }

  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);
}

if (require.main === module) {
  void bootstrap();
}
