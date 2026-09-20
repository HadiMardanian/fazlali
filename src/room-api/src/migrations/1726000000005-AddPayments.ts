import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPayments1726000000005 implements MigrationInterface {
  name = 'AddPayments1726000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE [payments] (
        [id]           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
        [roomId]       UNIQUEIDENTIFIER NOT NULL,
        [package]      VARCHAR(50)      NOT NULL,
        [amount]       DECIMAL(10,2)    NULL,
        [period]       VARCHAR(50)      NULL,
        [providerRef]  NVARCHAR(500)    NULL,
        [status]       VARCHAR(20)      NOT NULL DEFAULT 'completed',
        [createdAt]    DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_payments] PRIMARY KEY CLUSTERED ([id])
      )
    `);
    await queryRunner.query(`
      ALTER TABLE [payments]
        ADD CONSTRAINT [FK_payments_rooms]
        FOREIGN KEY ([roomId]) REFERENCES [rooms]([id]) ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE [rooms]
        ADD [paymentId] UNIQUEIDENTIFIER NULL
    `);
    await queryRunner.query(`
      ALTER TABLE [rooms]
        ADD CONSTRAINT [FK_rooms_payments]
        FOREIGN KEY ([paymentId]) REFERENCES [payments]([id]) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE [rooms] DROP CONSTRAINT [FK_rooms_payments]`);
    await queryRunner.query(`ALTER TABLE [rooms] DROP COLUMN [paymentId]`);
    await queryRunner.query(`ALTER TABLE [payments] DROP CONSTRAINT [FK_payments_rooms]`);
    await queryRunner.query(`DROP TABLE [payments]`);
  }
}
