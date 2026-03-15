import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";

export function isStorageEnabled() {
  return env.STORAGE_ENABLED;
}

function getStorageClient() {
  if (!env.STORAGE_ENABLED) {
    throw new AppError(503, "STORAGE_DISABLED", "Screenshot storage is disabled.");
  }

  return new S3Client({
    region: env.STORAGE_REGION,
    endpoint: env.STORAGE_ENDPOINT,
    forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.STORAGE_ACCESS_KEY!,
      secretAccessKey: env.STORAGE_SECRET_KEY!,
    },
  });
}

export async function createPresignedUpload(params: {
  key: string;
  contentType: string;
}) {
  const s3 = getStorageClient();
  const command = new PutObjectCommand({
    Bucket: env.STORAGE_BUCKET!,
    Key: params.key,
    ContentType: params.contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });

  return {
    uploadUrl,
    method: "PUT" as const,
    headers: {
      "Content-Type": params.contentType,
    },
  };
}

export async function getReadUrl(key: string) {
  if (!env.STORAGE_ENABLED) {
    return "";
  }

  if (!env.STORAGE_SIGNED_READS && env.STORAGE_PUBLIC_BASE_URL) {
    return `${env.STORAGE_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
  }

  const s3 = getStorageClient();
  const command = new GetObjectCommand({
    Bucket: env.STORAGE_BUCKET!,
    Key: key,
  });

  return getSignedUrl(s3, command, { expiresIn: env.STORAGE_SIGNED_READ_TTL_SECONDS });
}

export function storageObjectUrl(key: string) {
  if (!env.STORAGE_ENABLED) {
    return "";
  }

  if (env.STORAGE_PUBLIC_BASE_URL) {
    return `${env.STORAGE_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
  }

  return `${env.STORAGE_ENDPOINT!.replace(/\/$/, "")}/${env.STORAGE_BUCKET}/${key}`;
}
