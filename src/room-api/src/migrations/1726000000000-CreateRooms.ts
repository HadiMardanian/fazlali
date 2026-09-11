import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRooms1726000000000 implements MigrationInterface {
  name = 'CreateRooms1726000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE [rooms] (
        [id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
        [ownerId]       NVARCHAR(255)    NOT NULL,
        [title]         NVARCHAR(255)    NOT NULL,
        [eventDate]     DATETIME2        NULL,
        [guestCapacity] INT              NULL,
        [mode]          VARCHAR(20)      NOT NULL DEFAULT 'Private',
        [package]       VARCHAR(50)      NULL,
        [retentionUntil] DATETIME2       NULL,
        [status]        VARCHAR(20)      NOT NULL DEFAULT 'active',
        [inviteLink]    VARCHAR(500)     NULL,
        [pinHash]       VARCHAR(255)     NULL,
        [branding]      VARCHAR(1000)    NULL,
        [createdAt]     DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        [updatedAt]     DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_rooms] PRIMARY KEY CLUSTERED ([id])
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE [rooms]`);
  }
}
