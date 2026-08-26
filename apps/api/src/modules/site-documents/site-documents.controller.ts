import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '@/common/decorators/public.decorator';
import { SiteDocumentsService } from './site-documents.service';

@ApiTags('site-docs')
@Controller('site-docs')
export class SiteDocumentsController {
  constructor(private readonly docs: SiteDocumentsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List the documents published on the public site' })
  list() {
    return this.docs.list();
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Serve a published document, inline where the type allows it' })
  view(@Param('slug') slug: string, @Res() res: Response) {
    return this.serve(slug, 'inline', res);
  }

  @Public()
  @Get(':slug/download')
  @ApiOperation({ summary: 'Download a published document' })
  download(@Param('slug') slug: string, @Res() res: Response) {
    return this.serve(slug, 'attachment', res);
  }

  /**
   * Redirects to the object store where there is one, and streams the bytes otherwise.
   *
   * The redirect is deliberately not cached: the URL it points at is signed and short-lived, so
   * a browser replaying it from cache would follow an expired link. The object it lands on is
   * cacheable on its own terms.
   */
  private async serve(slug: string, want: 'inline' | 'attachment', res: Response) {
    const located = await this.docs.locate(slug, want);
    if (located.url) {
      res.setHeader('Cache-Control', 'no-store');
      res.redirect(302, located.url);
      return;
    }
    const { doc, body } = await this.docs.fetch(slug);
    this.send(res, doc.mimeType, doc.fileName, body, located.disposition);
  }

  private send(
    res: Response,
    mimeType: string,
    fileName: string,
    body: Buffer,
    disposition: 'inline' | 'attachment',
  ) {
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(fileName)}"`);
    // The type above is the allowlisted one from the row, so sniffing must not override it.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Even an inlined PDF gets no origin: it cannot reach our cookies or call our API.
    res.setHeader('Content-Security-Policy', 'sandbox');
    // These change only when someone republishes the file, and the whole point of the route is
    // that a 7 MB brochure is not re-fetched on every page view.
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(body);
  }
}
