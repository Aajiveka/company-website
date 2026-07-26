import { Module } from '@nestjs/common';
import { CandidatesService } from '@/modules/candidates/candidates.service';
import { FilesController } from './files.controller';

@Module({
  controllers: [FilesController],
  providers: [CandidatesService],
})
export class FilesModule {}
