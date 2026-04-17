import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1776266353685 implements MigrationInterface {
  name = 'InitialSchema1776266353685';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "veiculos" ("id" uuid NOT NULL, "placa" character varying NOT NULL, "modelo" character varying NOT NULL, "ano" integer NOT NULL, "ativo" boolean NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "UQ_3c7f2de70c4765a04c070a9f745" UNIQUE ("placa"), CONSTRAINT "PK_0c3daa1e5d16914bd9e7777cf77" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "motoristas" ("id" uuid NOT NULL, "servidorId" character varying NOT NULL, "cnhNumero" character varying NOT NULL, "cnhCategoria" character varying NOT NULL, "statusOperacional" character varying NOT NULL, "ativo" boolean NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "UQ_62b6dbad8e534b19ca8c468cfa8" UNIQUE ("servidorId"), CONSTRAINT "PK_bed77c88836201231df1d9314e5" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "motoristas"`);
    await queryRunner.query(`DROP TABLE "veiculos"`);
  }
}
