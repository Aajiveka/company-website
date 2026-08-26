export interface StoredFile {
  /** Path relative to the storage root, e.g. "files/cv/12-1699999999.pdf". */
  key: string;
  size: number;
  mimeType: string;
}

/** Response headers a signed URL should carry, so a redirect keeps the API's framing. */
export interface RedirectOptions {
  contentType: string;
  fileName: string;
  disposition: 'inline' | 'attachment';
}

export interface StorageDriver {
  put(key: string, body: Buffer, mimeType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  /** A URL the browser can fetch. Local serves through the API; S3 returns a signed URL. */
  url(key: string): Promise<string>;
  /**
   * A URL the browser can be redirected to, when the driver has one the object store serves
   * directly. Only S3 does: sending the caller there means the bytes travel once, from a store
   * that honours range requests, instead of being pulled into the API and proxied out again.
   * Absent on the local driver, whose files are only reachable through us.
   */
  redirectUrl?(key: string, opts: RedirectOptions): Promise<string>;
}

export const STORAGE_DRIVER = Symbol('STORAGE_DRIVER');
