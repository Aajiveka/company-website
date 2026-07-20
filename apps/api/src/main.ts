import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { text } from 'express';
import { AppModule } from './app.module';
import { env } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  // BillDesk posts a JWS with Content-Type: application/jose. Express's JSON parser would
  // reject it, so the raw body is captured for that one route.
  app.use('/api/payments/webhook', text({ type: '*/*' }));
  app.use(helmet());
  app.enableCors({ origin: env.CORS_ORIGIN, credentials: true });

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
  console.log(`API listening on http://localhost:${env.PORT}/api  (docs: /api/docs)`);
}

void bootstrap();
