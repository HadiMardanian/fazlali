import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddZips1726000000009 implements MigrationInterface {
  name = 'AddZips1726000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE [zips] (
        [id]           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
        [roomId]       UNIQUEIDENTIFIER NOT NULL,
        [status]       VARCHAR(20)      NOT NULL DEFAULT 'pending',
        [fileKey]      NVARCHAR(500)    NULL,
        [expiresAt]    DATETIME2        NULL,
        [downloadCount] INT             NOT NULL DEFAULT 0,
        [maxDownloads] INT              NULL,
        [createdAt]    DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        [finishedAt]   DATETIME2        NULL,
        [updatedAt]    DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_zips] PRIMARY KEY CLUSTERED ([id])
      )
    `);
    await queryRunner.query(`
      ALTER TABLE [zips]
        ADD CONSTRAINT [FK_zips_rooms]
        FOREIGN KEY ([roomId]) REFERENCES [rooms]([id]) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE [zips] DROP CONSTRAINT [FK_zips_rooms]`);
    await queryRunner.query(`DROP TABLE [zips]`);
  }
}
