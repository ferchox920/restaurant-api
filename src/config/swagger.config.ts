import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express, { Request, Response } from 'express';
import { dirname } from 'path';

function getSwaggerIndexHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Swagger UI</title>
  <link rel="stylesheet" type="text/css" href="/docs-assets/swagger-ui.css" />
  <link rel="icon" type="image/png" href="/docs-assets/favicon-32x32.png" sizes="32x32" />
  <link rel="icon" type="image/png" href="/docs-assets/favicon-16x16.png" sizes="16x16" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *,
    *:before,
    *:after {
      box-sizing: inherit;
    }
    body {
      margin: 0;
      background: #fafafa;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="/docs-assets/swagger-ui-bundle.js"></script>
  <script src="/docs-assets/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function () {
      window.ui = SwaggerUIBundle({
        url: '/docs-json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        persistAuthorization: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset,
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl,
        ],
      });
    };
  </script>
</body>
</html>`;
}

export function setupSwagger(app: INestApplication): void {
  const documentConfig = new DocumentBuilder()
    .setTitle('Restaurant Admin API')
    .setDescription(
      'API administrativa para gestion de restaurante, productos, inventario, ventas, usuarios y auditoria.',
    )
    .setVersion('0.1.0')
    .addTag('app', 'Metadata publica basica del servicio.')
    .addTag('health', 'Liveness y verificacion tecnica basica.')
    .addTag('auth', 'Autenticacion JWT y usuario autenticado.')
    .addTag('users', 'Gestion administrativa de usuarios internos.')
    .addTag('categories', 'Catalogo de categorias de productos.')
    .addTag(
      'sales-channels',
      'Canales de venta y configuracion operativa por canal.',
    )
    .addTag(
      'products',
      'Productos, costos historicos y precios historicos por canal.',
    )
    .addTag(
      'inventory',
      'Stock actual, movimientos y operaciones de inventario.',
    )
    .addTag('sale-tickets', 'Tickets de venta draft, confirmacion y void.')
    .addTag('audit-logs', 'Consulta de auditoria general del sistema.')
    .addTag('reports', 'Reportes operativos basados en datos historicos.')
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
  const swaggerUiAssetsPath = dirname(
    require.resolve('swagger-ui-dist/package.json'),
  );

  const sendSwaggerIndexHtml = (_request: Request, response: Response) => {
    response.type('html').send(getSwaggerIndexHtml());
  };

  instance.use('/docs-assets', express.static(swaggerUiAssetsPath));
  instance.get('/docs', sendSwaggerIndexHtml);
  instance.get('/docs/', (_request: Request, response: Response) => {
    response.redirect('/docs');
  });
  instance.get('/docs/index.html', sendSwaggerIndexHtml);
  instance.get('/docs-json', (_request: Request, response: Response) => {
    response.json(document);
  });
}
