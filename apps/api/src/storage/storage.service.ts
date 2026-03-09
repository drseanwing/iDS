import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('storage.endpoint');
    const accessKeyId = this.configService.get<string>('storage.accessKey') ?? '';
    const secretAccessKey = this.configService.get<string>('storage.secretKey') ?? '';
    this.bucket = this.configService.get<string>('storage.bucket', 'opengrade') ?? 'opengrade';

    this.s3 = new S3Client({
      endpoint,
      region: 'us-east-1', // required by SDK; MinIO accepts any value
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true, // required for MinIO / self-hosted S3-compatible storage
    });
  }

  /**
   * Upload a Buffer or string to S3-compatible object storage.
   * Returns the S3 key of the stored object.
   */
  async upload(key: string, body: Buffer | string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });
    await this.s3.send(command);
    this.logger.log(`Uploaded object: ${key}`);
    return key;
  }

  /**
   * Download an object and return its body as a Buffer.
   */
  async download(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const response = await this.s3.send(command);

    const stream = response.Body as Readable;
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  /**
   * Generate a pre-signed GET URL valid for the given number of seconds.
   */
  async getPresignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });
  }

  /**
   * Delete an object from storage.
   */
  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({ Bucket: this.bucket, Key: key });
    await this.s3.send(command);
    this.logger.log(`Deleted object: ${key}`);
  }

  /**
   * Check whether an object exists.
   */
  async exists(key: string): Promise<boolean> {
    try {
      await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }
}
