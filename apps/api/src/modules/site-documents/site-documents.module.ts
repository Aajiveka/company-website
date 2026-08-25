import { Module } from '@nestjs/common';
import { StorageModule } from '@/modules/storage/storage.module';
import { SiteDocumentsController } from './site-documents.controller';
import { SiteDocumentsService } from './site-documents.service';

@Module({
  imports: [StorageModule],
  controllers: [SiteDocumentsController],
  providers: [SiteDocumentsService],
})
export class SiteDocumentsModule {}
