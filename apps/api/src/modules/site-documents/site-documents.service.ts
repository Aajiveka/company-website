import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/modules/storage/storage.service';
import { STORAGE_DRIVER, type StorageDriver } from '@/modules/storage/storage.types';

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
    @Inject(STORAGE_DRIVER) private readonly driver: StorageDriver,
  ) {}

  list() {
    return this.prisma.client.siteDocument.findMany({
      where: { active: true },
      orderBy: { slug: 'asc' },
      select: { slug: true, title: true, fileName: true, sizeBytes: true, mimeType: true },
    });
  }

  private async row(slug: string) {
    const doc = await this.prisma.client.siteDocument.findFirst({
      where: { slug, active: true },
    });
    if (!doc) throw new NotFoundException(`No document published at "${slug}"`);
    return { doc, canInline: INLINE_TYPES.has(doc.mimeType) };
  }

  /**
   * Where to send the caller for the bytes, or null when only we can serve them.
   *
   * Proxying a multi-megabyte document meant pulling the whole object into the API's memory on
   * every request and pushing it out again — the brochure took anywhere from 3 to 40 seconds to
   * arrive, and the PDF viewer sat blank the whole time because a buffered response supports no
   * range requests. Handing the browser a signed URL lets it stream straight from the store.
   */
  async locate(slug: string, disposition: 'inline' | 'attachment') {
    const { doc, canInline } = await this.row(slug);
    const actual = disposition === 'inline' && !canInline ? 'attachment' : disposition;
    const url = await this.driver.redirectUrl?.(doc.storageKey, {
      contentType: doc.mimeType,
      fileName: doc.fileName,
      disposition: actual,
    });
    return { doc, disposition: actual, url: url ?? null };
  }

  /** The bytes themselves, for drivers with nowhere to redirect to (local disk). */
  async fetch(slug: string) {
    const { doc, canInline } = await this.row(slug);
    const body = await this.storage.read(doc.storageKey);
    return { doc, body, canInline };
  }
}
