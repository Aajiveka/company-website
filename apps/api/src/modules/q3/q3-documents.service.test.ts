/* eslint-disable @typescript-eslint/no-explicit-any -- the hand-rolled Prisma stub mirrors
   only the calls under test; typing it fully would be more fixture than test. */
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { NotFoundException } from '@nestjs/common';
import { Q3DocumentsService } from './q3-documents.service';

/**
 * Q3's document routes (file / verify / send-back) take a raw upload id. They must only reach
 * candidates Q3 has actually been handed — one with a referred application. Before the scope
 * check, walking the ids downloaded every candidate's identity documents.
 */
function build(referredApplications: number) {
  const reads: string[] = [];
  const db = {
    candidateDocumentUploaded: {
      findUnique: async () => ({
        docUploadID: 7n, subscriberID: 42n, documentPath: 'docs/aadhaar.pdf', fileName: 'aadhaar.pdf',
        documentTypeID: null, flgStatus: 0, documentMap: null,
      }),
    },
    jobSubscriberMapping: { count: async () => referredApplications },
    mstrDocuments: { findUnique: async () => null },
  };
  const storage = { read: async (key: string) => { reads.push(key); return Buffer.from('x'); } };
  const svc = new Q3DocumentsService(
    { client: db } as any, {} as any, {} as any, {} as any, {} as any, storage as any, {} as any,
  );
  return { svc, reads };
}

describe('Q3DocumentsService document scope', () => {
  it("refuses a document of a candidate Q3 was never referred", async () => {
    const { svc, reads } = build(0);
    await assert.rejects(() => svc.file(7), NotFoundException);
    await assert.rejects(() => svc.verify(7, 1), NotFoundException);
    assert.equal(reads.length, 0);
  });

  it('serves a document of a referred candidate', async () => {
    const { svc, reads } = build(1);
    const out = await svc.file(7);
    assert.equal(out.fileName, 'aadhaar.pdf');
    assert.deepEqual(reads, ['docs/aadhaar.pdf']);
  });
});
