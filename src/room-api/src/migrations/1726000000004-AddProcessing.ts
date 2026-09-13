import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProcessing1726000000004 implements MigrationInterface {
  name = 'AddProcessing1726000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE [media] ADD [thumbKey] NVARCHAR(500) NULL`);
    await queryRunner.query(`ALTER TABLE [media] ADD [webKey] NVARCHAR(500) NULL`);
    await queryRunner.query(`
      CREATE TABLE [jobs] (
        [id]         UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
        [mediaId]    UNIQUEIDENTIFIER NULL,
        [type]       VARCHAR(50)      NOT NULL,
        [status]     VARCHAR(20)      NOT NULL DEFAULT 'pending',
        [attempts]   INT              NOT NULL DEFAULT 0,
        [maxAttempts] INT             NOT NULL DEFAULT 5,
        [error]      NVARCHAR(1000)   NULL,
        [createdAt]  DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        [startedAt]  DATETIME2        NULL,
        [finishedAt] DATETIME2        NULL,
        [updatedAt]  DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_jobs] PRIMARY KEY CLUSTERED ([id])
      )
    `);
    await queryRunner.query(`
      ALTER TABLE [jobs]
        ADD CONSTRAINT [FK_jobs_media]
        FOREIGN KEY ([mediaId]) REFERENCES [media]([id]) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE [jobs] DROP CONSTRAINT [FK_jobs_media]`);
    await queryRunner.query(`DROP TABLE [jobs]`);
    await queryRunner.query(`ALTER TABLE [media] DROP COLUMN [webKey]`);
    await queryRunner.query(`ALTER TABLE [media] DROP COLUMN [thumbKey]`);
  }
}