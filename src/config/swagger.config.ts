import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Request, Response } from 'express';

export function setupSwagger(app: INestApplication): void {
  const documentConfig = new DocumentBuilder()
    .setTitle('Restaurant Admin API')
    .setDescription(
      'API administrativa para gestion de restaurante, productos, inventario, ventas, usuarios y auditoria.',
    )
    .setVersion('0.1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, documentConfig);
  const httpAdapter = app.getHttpAdapter();
  const instance = httpAdapter.getInstance();

  instance.get('/docs', (_request: Request, response: Response) => {
    response.redirect('/docs/');
  });

  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: false,
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
