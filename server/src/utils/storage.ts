import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type GetObjectCommandOutput,
} from "@aws-sdk/client-s3";

const BUCKET = process.env.STORAGE_BUCKET ?? "assets";

// Stored names are "<uuid>.<ext>", so the asset route can validate them strictly.
export const STORED_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|pdf|mp4)$/i;

// Object storage is active only when the Neon CLI (or the host) provided the
// AWS-standard credentials; otherwise uploads stay on local disk.
export function storageEnabled(): boolean {
  return Boolean(
    process.env.AWS_ENDPOINT_URL_S3 &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY,
  );
}

let client: S3Client | undefined;

function s3(): S3Client {
  // Neon uses path-style addressing; the client reads the AWS_* env vars itself.
  return (client ??= new S3Client({ forcePathStyle: true }));
}

export async function putStoredObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await s3().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getStoredObject(
  key: string,
): Promise<GetObjectCommandOutput | undefined> {
  try {
    return await s3().send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (error) {
    const name = (error as { name?: string }).name;
    if (name === "NotFound" || name === "NoSuchKey") return undefined;
    throw error;
  }
}

export async function deleteStoredObject(key: string): Promise<void> {
  await s3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
