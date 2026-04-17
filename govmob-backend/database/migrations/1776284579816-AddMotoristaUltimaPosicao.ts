import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMotoristaUltimaPosicao1776284579816 implements MigrationInterface {
    name = 'AddMotoristaUltimaPosicao1776284579816'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "motoristas" ADD "ultimaPosicao" geometry(Point,4326)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "motoristas" DROP COLUMN "ultimaPosicao"`);
    }

}
