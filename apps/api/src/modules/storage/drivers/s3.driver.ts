import { Injectable, NotFoundException } from '@nestjs/common';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@/config/env';
import type { RedirectOptions, StorageDriver } from '../storage.types';

/** Used when STORAGE_DRIVER=s3 and the bucket is configured. */
@Injectable()
export class S3StorageDriver implements StorageDriver {
  private readonly client = new S3Client({ region: env.AWS_REGION });
  private readonly bucket = env.S3_BUCKET!;

  async put(key: string, body: Buffer, mimeType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: mimeType }),
    );
  }

  async get(key: string): Promise<Buffer> {
    const res = await this.client
      .send(new GetObjectCommand({ Bucket: this.bucket, Key: key }))
      .catch(() => null);
    if (!res?.Body) throw new NotFoundException('File not found');
    return Buffer.from(await res.Body.transformToByteArray());
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  /** Signed, short-lived — the bucket stays private. */
  async url(key: string): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: 300,
    });
  }

  /**
   * The same signed URL, but with the response headers pinned.
   *
   * Without the overrides S3 would answer with whatever type it stored and no disposition, so
   * the redirect would lose the framing the API is responsible for.
   */
  async redirectUrl(key: string, opts: RedirectOptions): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentType: opts.contentType,
        ResponseContentDisposition: `${opts.disposition}; filename="${encodeURIComponent(opts.fileName)}"`,
      }),
      { expiresIn: 300 },
    );
  }
}
