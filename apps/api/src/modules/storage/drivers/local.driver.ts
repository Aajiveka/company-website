import { Injectable, NotFoundException } from '@nestjs/common';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, resolve } from 'node:path';
import { env } from '@/config/env';
import type { StorageDriver } from '../storage.types';

@Injectable()
export class LocalStorageDriver implements StorageDriver {
  private readonly root = resolve(env.STORAGE_LOCAL_ROOT);

  /**
   * Refuse to resolve outside the storage root. Without this a key of
   * "../../etc/passwd" reads whatever the process can read.
   */
  private resolveKey(key: string) {
    const full = resolve(join(this.root, normalize(key)));
    if (full !== this.root && !full.startsWith(this.root + '/')) {
      throw new NotFoundException('Invalid file path');
    }
    return full;
  }

  async put(key: string, body: Buffer): Promise<void> {
    const full = this.resolveKey(key);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, body);
  }

  async get(key: string): Promise<Buffer> {
    try {
      return await readFile(this.resolveKey(key));
    } catch {
      throw new NotFoundException('File not found');
    }
  }

  async delete(key: string): Promise<void> {
    await unlink(this.resolveKey(key)).catch(() => undefined);
  }

  async url(key: string): Promise<string> {
    return `/api/files/${key}`;
  }
}
