import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRetentionPolicies1726000000011 implements MigrationInterface {
  name = 'AddRetentionPolicies1726000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE [retention_policies] (
        [id]           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
        [roomId]       UNIQUEIDENTIFIER NOT NULL,
        [expiryAt]     DATETIME2        NOT NULL,
        [graceUntil]   DATETIME2        NULL,
        [notified7d]   BIT              NOT NULL DEFAULT 0,
        [notified3d]   BIT              NOT NULL DEFAULT 0,
        [notified1d]   BIT              NOT NULL DEFAULT 0,
        [action]       VARCHAR(20)      NOT NULL DEFAULT 'delete',
        [createdAt]    DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        [updatedAt]    DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_retention_policies] PRIMARY KEY CLUSTERED ([id])
      )
    `);
    await queryRunner.query(`
      ALTER TABLE [retention_policies]
        ADD CONSTRAINT [FK_retention_policies_rooms]
        FOREIGN KEY ([roomId]) REFERENCES [rooms]([id]) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE [retention_policies] DROP CONSTRAINT [FK_retention_policies_rooms]`);
    await queryRunner.query(`DROP TABLE [retention_policies]`);
  }
}
