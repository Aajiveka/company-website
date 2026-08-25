import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/modules/storage/storage.service';

/**
 * Types a stored site document may be handed to the browser as.
 *
 * Anything outside this list is only ever offered as a download. The generic file route
 * refuses to inline *any* stored file because those are user uploads; these are ours, but the
 * allowlist stays so that adding, say, an SVG or an HTML handbook later cannot quietly turn
 * into script execution on our own origin.
 */
const INLINE_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

@Injectable()
export class SiteDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  list() {
    return this.prisma.client.siteDocument.findMany({
      where: { active: true },
      orderBy: { slug: 'asc' },
      select: { slug: true, title: true, fileName: true, sizeBytes: true, mimeType: true },
    });
  }

  async fetch(slug: string) {
    const doc = await this.prisma.client.siteDocument.findFirst({
      where: { slug, active: true },
    });
    if (!doc) throw new NotFoundException(`No document published at "${slug}"`);
    const body = await this.storage.read(doc.storageKey);
    return { doc, body, canInline: INLINE_TYPES.has(doc.mimeType) };
  }
}
