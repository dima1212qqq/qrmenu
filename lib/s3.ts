import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

const S3_ENDPOINT = process.env.AWS_S3_ENDPOINT || "https://s3.twcstorage.ru";
const BUCKET_NAME = process.env.AWS_S3_BUCKET || "menuqrcode";

const s3Client = new S3Client({
  endpoint: S3_ENDPOINT,
  region: process.env.AWS_REGION || "ru-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: true,
});

export async function uploadImage(file: Buffer, filename: string, contentType: string): Promise<string> {
  const ext = filename.split(".").pop() || "jpg";
  const key = `dishes/${uuidv4()}.${ext}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
    })
  );

  return `${S3_ENDPOINT}/${BUCKET_NAME}/${key}`;
}

export async function deleteImage(imageUrl: string): Promise<void> {
  try {
    const key = imageUrl.replace(`${S3_ENDPOINT}/${BUCKET_NAME}/`, "");
    
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    );
  } catch (error) {
    console.error("Failed to delete image:", error);
  }
}

export { s3Client };
