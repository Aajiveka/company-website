export interface StoredFile {
  /** Path relative to the storage root, e.g. "files/cv/12-1699999999.pdf". */
  key: string;
  size: number;
  mimeType: string;
}

export interface StorageDriver {
  put(key: string, body: Buffer, mimeType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  /** A URL the browser can fetch. Local serves through the API; S3 returns a signed URL. */
  url(key: string): Promise<string>;
}

export const STORAGE_DRIVER = Symbol('STORAGE_DRIVER');
