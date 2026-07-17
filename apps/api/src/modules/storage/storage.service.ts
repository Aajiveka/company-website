import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { extname } from 'node:path';
import { PrismaService } from '@/prisma/prisma.service';
import { STORAGE_DRIVER, type StorageDriver, type StoredFile } from './storage.types';

/** Mirrors dbo.fncGetDocumentFolder: RootFolder + '/' + FolderName + '/'. */
const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};

@Injectable()
export class StorageService {
  constructor(
    @Inject(STORAGE_DRIVER) private readonly driver: StorageDriver,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * The legacy FileUploadHandler.ashx validated nothing — any extension, any size, any
   * content type, written straight into the web root. That is a remote-code-execution
   * shape on a .NET host. Everything is checked here, and the stored name is generated
   * rather than taken from the client.
   */
  private validate(file: Express.Multer.File) {
    if (!file?.buffer?.length) throw new BadRequestException('No file uploaded');
    if (file.size > MAX_BYTES) throw new BadRequestException('File must be 10 MB or smaller');

    const allowedExts = ALLOWED[file.mimetype];
    if (!allowedExts) throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);

    const ext = extname(file.originalname).toLowerCase();
    // The declared MIME type and the extension must agree, so "shell.aspx" cannot arrive
    // claiming to be a PDF.
    if (!allowedExts.includes(ext)) {
      throw new BadRequestException(`Extension ${ext || '(none)'} does not match ${file.mimetype}`);
    }
    return ext;
  }

  /** Resolves the folder for a document type from tblMstrDocuments, like the legacy UDF. */
  private async folderFor(documentTypeId: number) {
    const doc = await this.prisma.client.mstrDocuments.findUnique({
      where: { documentID: documentTypeId },
      select: { rootFolder: true, folderName: true },
    });
    if (!doc?.rootFolder || !doc.folderName) {
      throw new BadRequestException(`Unknown document type ${documentTypeId}`);
    }
    return `${doc.rootFolder}/${doc.folderName}`;
  }

  async upload(
    documentTypeId: number,
    ownerId: number,
    file: Express.Multer.File,
  ): Promise<StoredFile> {
    const ext = this.validate(file);
    const folder = await this.folderFor(documentTypeId);
    // Never reuse the client's filename: it is attacker-controlled.
    const key = `${folder}/${ownerId}-${Date.now()}-${randomBytes(6).toString('hex')}${ext}`;
    await this.driver.put(key, file.buffer, file.mimetype);
    return { key, size: file.size, mimeType: file.mimetype };
  }

  read(key: string) {
    return this.driver.get(key);
  }

  url(key: string) {
    return this.driver.url(key);
  }
}
