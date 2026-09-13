import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMedia1726000000002 implements MigrationInterface {
  name = 'CreateMedia1726000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE [media] (
        [id]          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
        [roomId]      UNIQUEIDENTIFIER NOT NULL,
        [uploaderRef] NVARCHAR(255)    NOT NULL,
        [kind]        VARCHAR(10)      NOT NULL,
        [originalKey] NVARCHAR(500)    NOT NULL,
        [size]        BIGINT           NOT NULL,
        [mime]        NVARCHAR(100)    NOT NULL,
        [status]      VARCHAR(20)      NOT NULL DEFAULT 'temp',
        [createdAt]   DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        [updatedAt]   DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_media] PRIMARY KEY CLUSTERED ([id])
      )
    `);
    await queryRunner.query(`
      ALTER TABLE [media]
        ADD CONSTRAINT [FK_media_rooms]
        FOREIGN KEY ([roomId]) REFERENCES [rooms]([id]) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE [media] DROP CONSTRAINT [FK_media_rooms]`);
    await queryRunner.query(`DROP TABLE [media]`);
  }
}