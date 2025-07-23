import sharp from "sharp";
import { S3Client, PutObjectCommand, GetObjectCommand,DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.ENV === "prod";
const bucketName = process.env.BUCKET_NAME;
const bucketRegion = process.env.BUCKET_REGION;
const accessKey = process.env.ACCESS_KEY;
const secretKey = process.env.SECRET_ACCESS_KEY;

const s3 = isProd ? new S3Client({
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretKey
  },
  region: bucketRegion
}) : null;

export const uploadToStorage = async (fileBuffer, fileName, folder = '', contentType = "application/octet-stream", convertToWebp = false) => {
    const ext = path.extname(fileName);
    const baseName = path.parse(fileName).name;
    const finalName = `${Date.now()}-${baseName}${convertToWebp ? '.webp' : ext}`;
    const key = folder ? `${folder}/${finalName}` : finalName;

    if (convertToWebp) {
      fileBuffer = await sharp(fileBuffer).webp().toBuffer();
      contentType = 'image/webp';
    }

    if (isProd) {
      await s3.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType
      }));
      return key;
    } else {
      const uploadDir = path.join(__dirname, '..', 'uploads', folder);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filePath = path.join(uploadDir, finalName);
      await fs.promises.writeFile(filePath, fileBuffer);
      return path.join(folder, finalName).replace(/\\/g, '/');
    }
  };
  export const deleteFromStorage = async (filePath) => {
    if (!filePath) return;

    if (isProd) {
      try {
        await s3.send(new DeleteObjectCommand({
          Bucket: bucketName,
          Key: filePath.split('?')[0]
        }));
      } catch (error) {
        console.error(`Error deleting file ${filePath}:`, error);
      }
    } else {
      const cleanPath = filePath.replace(/^\/?uploads\//, '');
      const fullPath = path.join(__dirname, '..', 'uploads', cleanPath);

      if (fs.existsSync(fullPath)) {
        try {
          await fs.promises.unlink(fullPath);
        } catch (error) {
          console.error(`Error deleting local file ${fullPath}:`, error);
        }
      }
    }
  };

  export const getFileUrl = async (filePath = {}) => {
    if (!filePath) return null;

    if (isProd) {
      try {
        const ext = path.extname(filePath).toLowerCase();
        const commandConfig = {
          Bucket: bucketName,
          Key: filePath,
        };

        if (ext === '.pdf') {
          commandConfig.ResponseContentDisposition = 'inline';
          commandConfig.ResponseContentType = 'application/pdf';
        }

        return await getSignedUrl(s3, new GetObjectCommand(commandConfig), { expiresIn: 604800 });
      } catch (error) {
        console.error("Error generating signed URL:", error);
        return null;
      }
    } else {
      const fullPath = path.join(__dirname, '..', 'uploads', filePath);
      return fs.existsSync(fullPath) ? `/uploads/${filePath}` : null;
    }
  };
