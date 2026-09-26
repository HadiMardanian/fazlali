import { BadRequestException } from '@nestjs/common';

export const VALID_PACKAGES = ['Basic', 'Wedding', 'Premium', 'Archive'] as const;

export type PackageName = typeof VALID_PACKAGES[number];

export interface PackageConfig {
  name: PackageName;
  storageGB: number;
  guestCap: number;
  retentionDays: number;
  zipAllow: boolean;
  slideshowAllow: boolean;
  maxFiles: number;
  maxFileSizeMB: number;
  zipDownloadLimit: number;
}

export const PACKAGES: Record<PackageName, PackageConfig> = {
  Basic: { name: 'Basic', storageGB: 10, guestCap: 50, retentionDays: 7, zipAllow: false, slideshowAllow: false, maxFiles: 500, maxFileSizeMB: 50, zipDownloadLimit: 0 },
  Wedding: { name: 'Wedding', storageGB: 50, guestCap: 200, retentionDays: 30, zipAllow: true, slideshowAllow: false, maxFiles: 5000, maxFileSizeMB: 200, zipDownloadLimit: 5 },
  Premium: { name: 'Premium', storageGB: 200, guestCap: 500, retentionDays: 90, zipAllow: true, slideshowAllow: true, maxFiles: 20000, maxFileSizeMB: 1000, zipDownloadLimit: 20 },
  Archive: { name: 'Archive', storageGB: 1000, guestCap: 1000, retentionDays: 365, zipAllow: true, slideshowAllow: true, maxFiles: 100000, maxFileSizeMB: 2000, zipDownloadLimit: 100 },
};

export function getPackage(name: string): PackageConfig {
  if (!VALID_PACKAGES.includes(name as PackageName)) {
    throw new BadRequestException(`Invalid package: ${name}. Must be one of: ${VALID_PACKAGES.join(', ')}`);
  }
  return PACKAGES[name as PackageName];
}

export function calculateRetentionUntil(packageName: string, days?: number): Date {
  const pkg = getPackage(packageName);
  const retentionDays = days ?? pkg.retentionDays;
  return new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);
}
