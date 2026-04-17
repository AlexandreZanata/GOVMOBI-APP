import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthFieldsToServidor1713273600000 implements MigrationInterface {
  name = 'AddAuthFieldsToServidor1713273600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adiciona a coluna senha (antes chamada de password no código)
    await queryRunner.query(
      `ALTER TABLE "servidores" ADD COLUMN IF NOT EXISTS "senha" character varying(255)`,
    );

    // Adiciona o status da conta se não existir
    await queryRunner.query(
      `ALTER TABLE "servidores" ADD COLUMN IF NOT EXISTS "status_conta" character varying(20) NOT NULL DEFAULT 'ativo'`,
    );

    // Adiciona os papeis se não existirem
    await queryRunner.query(
      `ALTER TABLE "servidores" ADD COLUMN IF NOT EXISTS "papeis" text array NOT NULL DEFAULT '{}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "servidores" DROP COLUMN "papeis"`);
    await queryRunner.query(
      `ALTER TABLE "servidores" DROP COLUMN "status_conta"`,
    );
    await queryRunner.query(`ALTER TABLE "servidores" DROP COLUMN "senha"`);
  }
}
