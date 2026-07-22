import { S3Client } from 'bun';
import { env } from '../../config/env';

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

/** Minimal shape of a bucket needed here; `Bun.S3Client` satisfies it structurally. */
export interface CoverBucket {
  file(key: string): {
    exists(): Promise<boolean>;
    write(data: Uint8Array, options: { type: string; acl: 'public-read' }): Promise<unknown>;
  };
}

export interface CoverStore {
  /** Uploads bytes under a content-addressed key (idempotent). Returns the public URL. */
  put(bytes: Uint8Array, contentType: string): Promise<string>;
}

export function createCoverStore(bucket: CoverBucket, publicBaseUrl: string): CoverStore {
  const base = publicBaseUrl.replace(/\/$/, '');
  return {
    async put(bytes, contentType) {
      const ext = EXT_BY_TYPE[contentType] ?? 'bin';
      const hash = new Bun.CryptoHasher('sha256').update(bytes).digest('hex');
      const key = `covers/${hash}.${ext}`;
      const file = bucket.file(key);
      if (!(await file.exists())) {
        await file.write(bytes, { type: contentType, acl: 'public-read' });
      }
      return `${base}/${key}`;
    },
  };
}

const r2Configured = Boolean(
  env.R2_ACCOUNT_ID &&
  env.R2_ACCESS_KEY_ID &&
  env.R2_SECRET_ACCESS_KEY &&
  env.R2_BUCKET &&
  env.COVERS_PUBLIC_URL
);

export const coverStore: CoverStore | null = r2Configured
  ? createCoverStore(
      new S3Client({
        accessKeyId: env.R2_ACCESS_KEY_ID as string,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY as string,
        bucket: env.R2_BUCKET as string,
        endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      }),
      env.COVERS_PUBLIC_URL as string
    )
  : null;
