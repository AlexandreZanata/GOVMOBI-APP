import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const config = new DocumentBuilder()
    .setTitle('GovMob API')
    .setDescription(
      'API do Sistema GovMob para gestão de frotas, identidade e despacho de corridas.',
    )
    .setVersion('1.0')
    .addTag('Identidade', 'Gestão de servidores, cargos e lotações')
    .addTag('Frota', 'Gestão de veículos e cadastro de motoristas')
    .addTag('Cartografia', 'Inteligência espacial e limites municipais')
    .addTag('Passageiro', 'Ações de solicitação e acompanhamento de corridas')
    .addTag('Motorista', 'Ações de aceite e execução de corridas')
    .addTag('Monitoramento', 'Auditoria e saúde do sistema')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(
    configService.get<string>('config.app.apiPrefix') || 'api',
    app,
    document,
    {
      jsonDocumentUrl: 'api-json',
    },
  );

  app.enableCors({
    origin: configService.get<string>('config.app.corsOrigins'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const port = configService.get<number>('config.app.port') ?? 3000;
  await app.listen(port);
  console.log(
    `Servidor rodando em: http://localhost:${port}/${configService.get('config.app.apiPrefix')}`,
  );
}

bootstrap().catch((e) => console.error(e));
