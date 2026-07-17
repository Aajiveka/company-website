import { Global, Logger, Module } from '@nestjs/common';
import { env } from '@/config/env';
import { LocalStorageDriver } from './drivers/local.driver';
import { S3StorageDriver } from './drivers/s3.driver';
import { StorageService } from './storage.service';
import { STORAGE_DRIVER } from './storage.types';

const logger = new Logger('StorageModule');

@Global()
@Module({
  providers: [
    LocalStorageDriver,
    StorageService,
    {
      provide: STORAGE_DRIVER,
      useFactory: (local: LocalStorageDriver) => {
        if (env.STORAGE_DRIVER === 's3') {
          if (!env.S3_BUCKET) throw new Error('STORAGE_DRIVER=s3 but S3_BUCKET is not set');
          return new S3StorageDriver();
        }
        logger.log(`storing files on disk at ${env.STORAGE_LOCAL_ROOT}`);
        return local;
      },
      inject: [LocalStorageDriver],
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
