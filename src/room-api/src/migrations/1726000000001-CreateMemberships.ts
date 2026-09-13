import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMemberships1726000000001 implements MigrationInterface {
  name = 'CreateMemberships1726000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE [memberships] (
        [id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
        [roomId]        UNIQUEIDENTIFIER NOT NULL,
        [deviceId]      NVARCHAR(255)    NOT NULL,
        [displayName]   NVARCHAR(100)    NOT NULL,
        [role]          VARCHAR(20)      NOT NULL DEFAULT 'Guest',
        [tokenHash]     VARCHAR(64)      NULL,
        [sessionExpiry] DATETIME2        NULL,
        [blocked]       BIT              NOT NULL DEFAULT 0,
        [createdAt]     DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        [updatedAt]     DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_memberships] PRIMARY KEY CLUSTERED ([id])
      )
    `);
    await queryRunner.query(`
      ALTER TABLE [memberships]
        ADD CONSTRAINT [FK_memberships_rooms]
        FOREIGN KEY ([roomId]) REFERENCES [rooms]([id]) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE [memberships] DROP CONSTRAINT [FK_memberships_rooms]`);
    await queryRunner.query(`DROP TABLE [memberships]`);
  }
}