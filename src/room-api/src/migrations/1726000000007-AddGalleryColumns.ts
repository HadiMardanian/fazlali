import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGalleryColumns1726000000007 implements MigrationInterface {
  name = 'AddGalleryColumns1726000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE [media] ADD [likedBy] NVARCHAR(MAX) NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE [media] DROP COLUMN [likedBy]`);
  }
}
