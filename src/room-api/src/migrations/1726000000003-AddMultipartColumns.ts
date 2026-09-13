import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMultipartColumns1726000000003 implements MigrationInterface {
  name = 'AddMultipartColumns1726000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE [media] ADD [multipartUploadId] NVARCHAR(500) NULL`);
    await queryRunner.query(`ALTER TABLE [media] ADD [totalParts] INT NULL`);
    await queryRunner.query(`ALTER TABLE [media] ADD [uploadStartedAt] DATETIME2 NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE [media] DROP COLUMN [uploadStartedAt]`);
    await queryRunner.query(`ALTER TABLE [media] DROP COLUMN [totalParts]`);
    await queryRunner.query(`ALTER TABLE [media] DROP COLUMN [multipartUploadId]`);
  }
}