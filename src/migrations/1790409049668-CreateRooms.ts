import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateRooms1790409049668 implements MigrationInterface {
    name = 'CreateRooms1790409049668'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "rooms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ownerId" character varying NOT NULL, "title" character varying NOT NULL, "eventDate" TIMESTAMP, "guestCapacity" integer, "mode" character varying(20) NOT NULL DEFAULT 'Private', "package" character varying(50), "retentionUntil" TIMESTAMP, "status" character varying(20) NOT NULL DEFAULT 'active', "inviteLink" character varying(500), "pinHash" character varying(255), "branding" character varying(1000), "paymentId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0368a2d7c215f2d0458a54933f2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "memberships" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "roomId" uuid NOT NULL, "deviceId" character varying(255) NOT NULL, "displayName" character varying(100) NOT NULL, "role" character varying(20) NOT NULL DEFAULT 'Guest', "tokenHash" character varying(64), "sessionExpiry" TIMESTAMP, "blocked" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_25d28bd932097a9e90495ede7b4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "roomId" uuid NOT NULL, "package" character varying(50) NOT NULL, "amount" numeric(10,2), "period" character varying(50), "providerRef" character varying(500), "status" character varying(20) NOT NULL DEFAULT 'completed', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "retention_policies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "roomId" uuid NOT NULL, "expiryAt" TIMESTAMP NOT NULL, "graceUntil" TIMESTAMP, "notified7d" boolean NOT NULL DEFAULT false, "notified3d" boolean NOT NULL DEFAULT false, "notified1d" boolean NOT NULL DEFAULT false, "action" character varying(20) NOT NULL DEFAULT 'delete', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c0f79bfde72a93e544c780a7470" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "media" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "roomId" uuid NOT NULL, "uploaderRef" character varying(255) NOT NULL, "kind" character varying(10) NOT NULL, "originalKey" character varying(500) NOT NULL, "thumbKey" character varying(500), "webKey" character varying(500), "multipartUploadId" character varying(500), "totalParts" integer, "uploadStartedAt" TIMESTAMP, "size" bigint NOT NULL, "mime" character varying(100) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'temp', "gpsStripped" boolean NOT NULL DEFAULT false, "malwareScanStatus" character varying(20) NOT NULL DEFAULT 'pending', "malwareNote" character varying(500), "likedBy" jsonb, "moderationNote" character varying(500), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f4e0fcac36e050de337b670d8bd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" character varying(50) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'pending', "attempts" integer NOT NULL DEFAULT '0', "maxAttempts" integer NOT NULL DEFAULT '5', "error" character varying(1000), "mediaId" uuid, "zipId" character varying(255), "policyId" character varying(255), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "startedAt" TIMESTAMP, "finishedAt" TIMESTAMP, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_cf0a6c42b72fcc7f7c237def345" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "content_reports" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "mediaId" uuid NOT NULL, "reporterRef" character varying(255) NOT NULL, "reason" text NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'pending', "handledBy" character varying(255), "handledAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6c59a68146cdde8de564ee649c1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "zips" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "roomId" uuid NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'pending', "fileKey" character varying(500), "expiresAt" TIMESTAMP, "downloadCount" integer NOT NULL DEFAULT '0', "maxDownloads" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "finishedAt" TIMESTAMP, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d74e73700e64ad1098866ba99d3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "roomId" character varying NOT NULL, "actor" character varying(255) NOT NULL, "action" character varying(50) NOT NULL, "target" character varying(500), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "memberships" ADD CONSTRAINT "FK_abfcb797adf1ebd1cdc1f14d91e" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_aa4b4186dd472f803a4103e3981" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "retention_policies" ADD CONSTRAINT "FK_188dbe30a95143229dd9a0c3ebc" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "media" ADD CONSTRAINT "FK_62d9fac0ac0db2854dd1e8f007a" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "jobs" ADD CONSTRAINT "FK_43e4e2092c6aa84d8268fa2d4d5" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "content_reports" ADD CONSTRAINT "FK_58fdabbd271c2cf3ba7dc372390" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "zips" ADD CONSTRAINT "FK_332def3d64b6a10a7bdc4aac33e" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "zips" DROP CONSTRAINT "FK_332def3d64b6a10a7bdc4aac33e"`);
        await queryRunner.query(`ALTER TABLE "content_reports" DROP CONSTRAINT "FK_58fdabbd271c2cf3ba7dc372390"`);
        await queryRunner.query(`ALTER TABLE "jobs" DROP CONSTRAINT "FK_43e4e2092c6aa84d8268fa2d4d5"`);
        await queryRunner.query(`ALTER TABLE "media" DROP CONSTRAINT "FK_62d9fac0ac0db2854dd1e8f007a"`);
        await queryRunner.query(`ALTER TABLE "retention_policies" DROP CONSTRAINT "FK_188dbe30a95143229dd9a0c3ebc"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_aa4b4186dd472f803a4103e3981"`);
        await queryRunner.query(`ALTER TABLE "memberships" DROP CONSTRAINT "FK_abfcb797adf1ebd1cdc1f14d91e"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`DROP TABLE "zips"`);
        await queryRunner.query(`DROP TABLE "content_reports"`);
        await queryRunner.query(`DROP TABLE "jobs"`);
        await queryRunner.query(`DROP TABLE "media"`);
        await queryRunner.query(`DROP TABLE "retention_policies"`);
        await queryRunner.query(`DROP TABLE "payments"`);
        await queryRunner.query(`DROP TABLE "memberships"`);
        await queryRunner.query(`DROP TABLE "rooms"`);
    }

}
