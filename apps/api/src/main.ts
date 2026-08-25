import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { patchNestJsSwagger } from 'nestjs-zod';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.enableCors({
    origin: [process.env.FRONTEND_URL ?? 'http://localhost:3002'],
    credentials: true,
  });
  app.setGlobalPrefix('api');

  patchNestJsSwagger();
  const config = new DocumentBuilder()
    .setTitle('Fluxo API')
    .setDescription('API de finanzas personales de Fluxo')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
