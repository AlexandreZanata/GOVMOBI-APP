import { MigrationInterface, QueryRunner } from "typeorm";

export class StabilizeSchema1776282206311 implements MigrationInterface {
    name = 'StabilizeSchema1776282206311'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
        await queryRunner.query(`CREATE TYPE "public"."outbox_events_status_enum" AS ENUM('pendente', 'publicado', 'falhou')`);
        await queryRunner.query(`CREATE TABLE "outbox_events" ("id" uuid NOT NULL, "aggregateId" character varying NOT NULL, "aggregateType" character varying NOT NULL, "eventName" character varying NOT NULL, "payload" jsonb NOT NULL, "status" "public"."outbox_events_status_enum" NOT NULL DEFAULT 'pendente', "retryCount" integer NOT NULL DEFAULT '0', "errorMessage" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "publishedAt" TIMESTAMP, "nextRetryAt" TIMESTAMP, CONSTRAINT "PK_6689a16c00d09b8089f6237f1d2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "corridas" ("id" uuid NOT NULL, "status" character varying NOT NULL, "passageiro_id" uuid NOT NULL, "motorista_id" uuid, "veiculo_id" uuid, "origem_lat" double precision NOT NULL, "origem_lng" double precision NOT NULL, "destino_lat" double precision NOT NULL, "destino_lng" double precision NOT NULL, "motivo_servico" character varying NOT NULL, "prioridade_nivel" integer NOT NULL DEFAULT '1', "tentativas_despacho" integer NOT NULL DEFAULT '0', "distancia_metros" double precision, "duracao_segundos" integer, "score_prioridade" double precision, "cancelado_por" character varying, "motivo_cancelamento" text, "timestamps" jsonb NOT NULL DEFAULT '{}', "version" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f16c8cc788772dad1531bf05a61" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "auditoria_eventos" ("id" uuid NOT NULL, "event_name" character varying(100) NOT NULL, "aggregate_id" uuid NOT NULL, "aggregate_type" character varying(50) NOT NULL, "payload" jsonb NOT NULL, "occurred_at" TIMESTAMP NOT NULL, "servidor_id" uuid, "ip_address" character varying(45), "is_critico" boolean NOT NULL DEFAULT false, "hash" character varying(64) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d70903f8c0e380d213a614cfff7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_auditoria_servidor" ON "auditoria_eventos" ("servidor_id") `);
        await queryRunner.query(`CREATE INDEX "idx_auditoria_occurred" ON "auditoria_eventos" ("occurred_at") `);
        await queryRunner.query(`CREATE INDEX "idx_auditoria_aggregate" ON "auditoria_eventos" ("aggregate_id", "event_name") `);
        await queryRunner.query(`ALTER TABLE "veiculos" ADD "tipo" character varying NOT NULL DEFAULT 'sedan'`);
        await queryRunner.query(`ALTER TABLE "veiculos" ADD "status" character varying NOT NULL DEFAULT 'disponivel'`);
        await queryRunner.query(`ALTER TABLE "veiculos" ADD "motorista_ativo_id" uuid`);
        await queryRunner.query(`ALTER TABLE "veiculos" ADD "quilometragem" double precision NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "veiculos" ADD "ultima_manutencao" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "veiculos" ADD "documentos" jsonb NOT NULL DEFAULT '{}'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "veiculos" DROP COLUMN "documentos"`);
        await queryRunner.query(`ALTER TABLE "veiculos" DROP COLUMN "ultima_manutencao"`);
        await queryRunner.query(`ALTER TABLE "veiculos" DROP COLUMN "quilometragem"`);
        await queryRunner.query(`ALTER TABLE "veiculos" DROP COLUMN "motorista_ativo_id"`);
        await queryRunner.query(`ALTER TABLE "veiculos" DROP COLUMN "status"`);
        await queryRunner.query(`ALTER TABLE "veiculos" DROP COLUMN "tipo"`);
        await queryRunner.query(`DROP INDEX "public"."idx_auditoria_aggregate"`);
        await queryRunner.query(`DROP INDEX "public"."idx_auditoria_occurred"`);
        await queryRunner.query(`DROP INDEX "public"."idx_auditoria_servidor"`);
        await queryRunner.query(`DROP TABLE "auditoria_eventos"`);
        await queryRunner.query(`DROP TABLE "corridas"`);
        await queryRunner.query(`DROP TABLE "outbox_events"`);
        await queryRunner.query(`DROP TYPE "public"."outbox_events_status_enum"`);
    }

}
