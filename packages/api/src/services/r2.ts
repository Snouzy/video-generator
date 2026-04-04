import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { promises as fs } from "fs";
import path from "path";

const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = "public";
const PUBLIC_URL = process.env.R2_PUBLIC_URL ?? "https://images.fitlinks.io";

export async function uploadBufferToR2(buffer: Buffer, key: string, contentType: string): Promise<string> {
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return `${PUBLIC_URL}/${key}`;
}

export async function uploadToR2(localPath: string, key: string): Promise<string> {
  const absolutePath = localPath.startsWith("/")
    ? path.join(process.cwd(), "public", localPath.slice(1))
    : path.resolve(localPath);

  const buffer = await fs.readFile(absolutePath);
  const ext = path.extname(absolutePath).slice(1).toLowerCase();
  const mimeTypes: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
  };
  const contentType = mimeTypes[ext] ?? "application/octet-stream";

  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return `${PUBLIC_URL}/${key}`;
}
