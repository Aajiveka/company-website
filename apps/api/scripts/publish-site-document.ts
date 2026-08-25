/**
 * Publishes a file as a site document: bytes to storage, one row in tblSiteDocument.
 *
 * Run from apps/api, against whichever environment the loaded .env points at:
 *   npx tsx scripts/publish-site-document.ts \
 *     --file ../../Aajivika\ Book.pdf --slug aajivika-book --title "Aajivika Book"
 *
 * Re-running with the same slug replaces the file and updates the row, so republishing the
 * brochure is this one command rather than a redeploy. It goes through the app's own storage
 * driver, so the same command writes to the local root in dev and to S3 in production.
 */
import { readFileSync, statSync } from 'node:fs';
import { basename, extname } from 'node:path';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageModule } from '../src/modules/storage/storage.module';
import { LocalStorageDriver } from '../src/modules/storage/drivers/local.driver';
import { S3StorageDriver } from '../src/modules/storage/drivers/s3.driver';
import { STORAGE_DRIVER, type StorageDriver } from '../src/modules/storage/storage.types';
import { env } from '../src/config/env';

/**
 * Just the two pieces this script needs. Booting the whole AppModule would drag in the queues,
 * mailer and health probes, none of which a one-shot upload has any business starting.
 *
 * StorageModule keeps its driver private, so the choice is repeated here rather than exported
 * — the same env var decides it, so the script writes wherever the running API reads.
 */
@Module({
  imports: [PrismaModule, StorageModule],
  providers: [
    LocalStorageDriver,
    {
      provide: STORAGE_DRIVER,
      useFactory: (local: LocalStorageDriver) =>
        env.STORAGE_DRIVER === 's3' ? new S3StorageDriver() : local,
      inject: [LocalStorageDriver],
    },
  ],
})
class PublishModule {}

const MIME_BY_EXT: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main() {
  const file = arg('file');
  const slug = arg('slug');
  if (!file || !slug) {
    throw new Error('Usage: --file <path> --slug <slug> [--title <title>]');
  }
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(slug)) {
    throw new Error(`Slug must be lowercase letters, digits and dashes: got "${slug}"`);
  }

  const ext = extname(file).toLowerCase();
  const mimeType = MIME_BY_EXT[ext];
  if (!mimeType) throw new Error(`Unsupported extension "${ext}" — allowed: ${Object.keys(MIME_BY_EXT).join(', ')}`);

  const body = readFileSync(file);
  const sizeBytes = statSync(file).size;
  const title = arg('title') ?? basename(file, ext);
  const fileName = `${slug}${ext}`;
  // Stable key: republishing overwrites the object instead of orphaning the old one.
  const storageKey = `site/docs/${fileName}`;

  const app = await NestFactory.createApplicationContext(PublishModule, { logger: ['warn', 'error'] });
  try {
    const driver = app.get<StorageDriver>(STORAGE_DRIVER);
    const prisma = app.get(PrismaService);

    await driver.put(storageKey, body, mimeType);

    const row = await prisma.client.siteDocument.upsert({
      where: { slug },
      create: { slug, title, storageKey, mimeType, sizeBytes, fileName, active: true },
      update: { title, storageKey, mimeType, sizeBytes, fileName, active: true, timestampUpd: new Date() },
    });

    console.log(
      `published "${row.slug}" → ${storageKey} (${mimeType}, ${(sizeBytes / 1024 / 1024).toFixed(2)} MB)`,
    );
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
