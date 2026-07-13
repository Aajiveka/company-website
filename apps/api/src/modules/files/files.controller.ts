import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser, type RequestUser } from '@/common/decorators/current-user.decorator';
import { StorageService } from '@/modules/storage/storage.service';
import { AuditService } from '@/modules/audit/audit.service';

@ApiTags('files')
@ApiBearerAuth()
@Controller('files')
export class FilesController {
  constructor(
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  @Post('upload/:documentTypeId')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiOperation({
    summary: 'Upload a file for a document type (tblMstrDocuments.DocumentID)',
    description:
      'The folder is resolved from tblMstrDocuments (RootFolder/FolderName), the same way ' +
      'the legacy dbo.fncGetDocumentFolder did. The stored filename is generated, not taken ' +
      'from the client.',
  })
  async upload(
    @Param('documentTypeId') documentTypeId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: RequestUser,
  ) {
    const stored = await this.storage.upload(Number(documentTypeId), user.userId, file);
    await this.audit.record({
      userId: user.userId,
      action: 'file.uploaded',
      entity: 'Document',
      entityId: documentTypeId,
      detail: { key: stored.key, size: stored.size, mimeType: stored.mimeType },
    });
    return { ...stored, url: await this.storage.url(stored.key) };
  }

  /** Serves a locally-stored file. With the S3 driver the browser uses a signed URL instead. */
  @Get(':folder/:sub/:name')
  @ApiOperation({ summary: 'Download a stored file (local driver)' })
  async download(
    @Param('folder') folder: string,
    @Param('sub') sub: string,
    @Param('name') name: string,
    @Res() res: Response,
  ) {
    const body = await this.storage.read(`${folder}/${sub}/${name}`);
    // Never inline: a stored SVG or HTML would otherwise execute on our origin.
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(body);
  }
}
