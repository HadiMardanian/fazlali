import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddZipIdToJobs1726000000010 implements MigrationInterface {
  name = 'AddZipIdToJobs1726000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE [jobs]
        ADD [zipId] NVARCHAR(255) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE [jobs] DROP COLUMN [zipId]
    `);
  }
}
