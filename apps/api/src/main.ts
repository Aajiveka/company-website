import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { text } from 'express';
import { AppModule } from './app.module';
import { env } from './config/env';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // The API is only reachable through the web container's nginx — one hop. Without this,
  // req.ip is nginx's address for every request, so the throttler put all users in one
  // bucket: six logins a minute site-wide locked everyone out. With exactly one trusted hop,
  // Express takes the address nginx appended, which a client cannot spoof.
  app.set('trust proxy', 1);

  app.setGlobalPrefix('api');
  // BillDesk posts a JWS with Content-Type: application/jose. Express's JSON parser would
  // reject it, so the raw body is captured for that one route.
  app.use('/api/payments/webhook', text({ type: '*/*' }));
  app.use(helmet());
  // Comma-separated origins (localhost + LAN IP for same‑Wi‑Fi phones/laptops).
  const corsOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    credentials: true,
  });

  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // BigInt is all over this schema (the legacy keys are bigint) and JSON.stringify throws
  // on it. Serialise as a number — every id here is far inside Number.MAX_SAFE_INTEGER.
  (BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function () {
    return Number(this);
  };

  const config = new DocumentBuilder()
    .setTitle('Aajiveka API')
    .setDescription('Recruitment / ATS platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  await app.listen(env.PORT);
  app.enableShutdownHooks();
  console.log(`API listening on http://localhost:${env.PORT}/api  (docs: /api/docs)`);
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

void bootstrap();
