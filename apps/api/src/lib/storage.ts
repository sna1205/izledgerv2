import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";

export function isStorageEnabled() {
  return env.STORAGE_ENABLED;
}

export function normalizeStorageEndpoint(endpoint: string | undefined, bucket = env.STORAGE_BUCKET) {
  if (!endpoint) {
    return endpoint;
  }

  const normalizedEndpoint = new URL(endpoint);
  const trimmedPath = normalizedEndpoint.pathname.replace(/\/+$/, "");

  // Some S3-compatible dashboards show endpoints with the bucket appended.
  // The S3 client adds the bucket itself, so strip that duplicate segment.
  if (bucket && trimmedPath === `/${bucket}`) {
    normalizedEndpoint.pathname = "/";
  }

  return normalizedEndpoint.toString().replace(/\/$/, "");
}

function getStorageClient() {
  if (!env.STORAGE_ENABLED) {
    throw new AppError(503, "STORAGE_DISABLED", "Screenshot storage is disabled.");
  }

  return new S3Client({
    region: env.STORAGE_REGION,
    endpoint: normalizeStorageEndpoint(env.STORAGE_ENDPOINT),
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

export async function getObjectMetadata(key: string) {
  const s3 = getStorageClient();

  try {
    const response = await s3.send(
      new HeadObjectCommand({
        Bucket: env.STORAGE_BUCKET!,
        Key: key,
      }),
    );

    return {
      exists: true,
      contentType: response.ContentType ?? null,
      contentLength: response.ContentLength ?? null,
    };
  } catch (error) {
    const statusCode =
      typeof error === "object" && error !== null && "$metadata" in error
        ? ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode ?? null)
        : null;
    const errorName =
      typeof error === "object" && error !== null && "name" in error
        ? String((error as { name?: string }).name)
        : "";

    if (statusCode === 404 || errorName === "NotFound" || errorName === "NoSuchKey") {
      return {
        exists: false,
        contentType: null,
        contentLength: null,
      };
    }

    throw error;
  }
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

export async function deleteObjectIfPresent(key: string) {
  if (!env.STORAGE_ENABLED) {
    return;
  }

  const s3 = getStorageClient();

  await s3.send(
    new DeleteObjectCommand({
      Bucket: env.STORAGE_BUCKET!,
      Key: key,
    }),
  );
}

export async function objectExists(key: string) {
  const metadata = await getObjectMetadata(key);
  return metadata.exists;
}

export async function listObjectKeys(params?: {
  prefix?: string;
  continuationToken?: string;
  maxKeys?: number;
}) {
  if (!env.STORAGE_ENABLED) {
    return {
      keys: [],
      nextContinuationToken: undefined,
    };
  }

  const s3 = getStorageClient();
  const response = await s3.send(
    new ListObjectsV2Command({
      Bucket: env.STORAGE_BUCKET!,
      Prefix: params?.prefix,
      ContinuationToken: params?.continuationToken,
      MaxKeys: params?.maxKeys,
    }),
  );

  return {
    keys: (response.Contents ?? [])
      .map((item) => item.Key)
      .filter((key): key is string => Boolean(key)),
    nextContinuationToken: response.IsTruncated ? response.NextContinuationToken ?? undefined : undefined,
  };
}

export function storageObjectUrl(key: string) {
  if (!env.STORAGE_ENABLED) {
    return "";
  }

  if (env.STORAGE_PUBLIC_BASE_URL) {
    return `${env.STORAGE_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
  }

  return `${normalizeStorageEndpoint(env.STORAGE_ENDPOINT)!}/${env.STORAGE_BUCKET}/${key}`;
}
