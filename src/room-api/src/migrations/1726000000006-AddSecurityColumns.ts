import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSecurityColumns1726000000006 implements MigrationInterface {
  name = 'AddSecurityColumns1726000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE [media] ADD [gpsStripped] BIT NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE [media] ADD [malwareScanStatus] VARCHAR(20) NOT NULL DEFAULT 'pending'`);
    await queryRunner.query(`ALTER TABLE [media] ADD [malwareNote] NVARCHAR(500) NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE [media] DROP COLUMN [malwareNote]`);
    await queryRunner.query(`ALTER TABLE [media] DROP COLUMN [malwareScanStatus]`);
    await queryRunner.query(`ALTER TABLE [media] DROP COLUMN [gpsStripped]`);
  }
}
