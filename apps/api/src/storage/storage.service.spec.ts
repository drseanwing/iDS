import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');

const mockSend = jest.fn();

(S3Client as jest.MockedClass<typeof S3Client>).mockImplementation(
  () => ({ send: mockSend }) as any,
);

const mockGetSignedUrl = getSignedUrl as jest.MockedFunction<typeof getSignedUrl>;

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue?: string) => {
              const map: Record<string, string> = {
                'storage.endpoint': 'http://localhost:9000',
                'storage.accessKey': 'minioadmin',
                'storage.secretKey': 'minioadmin',
                'storage.bucket': 'opengrade',
              };
              return map[key] ?? defaultValue;
            },
          },
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upload', () => {
    it('should call PutObjectCommand and return the key', async () => {
      mockSend.mockResolvedValue({});
      const key = await service.upload('my/key.json', Buffer.from('data'), 'application/json');
      expect(mockSend).toHaveBeenCalledTimes(1);
      const calledArg = mockSend.mock.calls[0][0];
      expect(calledArg).toBeInstanceOf(PutObjectCommand);
      expect(key).toBe('my/key.json');
    });
  });

  describe('download', () => {
    it('should return a buffer from a readable stream', async () => {
      const readable = Readable.from([Buffer.from('hello'), Buffer.from(' world')]);
      mockSend.mockResolvedValue({ Body: readable });
      const buf = await service.download('my/key.json');
      expect(buf.toString()).toBe('hello world');
      const calledArg = mockSend.mock.calls[0][0];
      expect(calledArg).toBeInstanceOf(GetObjectCommand);
    });
  });

  describe('getPresignedUrl', () => {
    it('should return a presigned URL', async () => {
      mockGetSignedUrl.mockResolvedValue('https://example.com/signed');
      const url = await service.getPresignedUrl('my/key.json');
      expect(url).toBe('https://example.com/signed');
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(GetObjectCommand),
        { expiresIn: 3600 },
      );
    });

    it('should accept a custom expiry', async () => {
      mockGetSignedUrl.mockResolvedValue('https://example.com/signed2');
      await service.getPresignedUrl('my/key.json', 600);
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(GetObjectCommand),
        { expiresIn: 600 },
      );
    });
  });

  describe('delete', () => {
    it('should call DeleteObjectCommand', async () => {
      mockSend.mockResolvedValue({});
      await service.delete('my/key.json');
      const calledArg = mockSend.mock.calls[0][0];
      expect(calledArg).toBeInstanceOf(DeleteObjectCommand);
    });
  });

  describe('exists', () => {
    it('should return true when object exists', async () => {
      mockSend.mockResolvedValue({});
      const result = await service.exists('my/key.json');
      expect(result).toBe(true);
      const calledArg = mockSend.mock.calls[0][0];
      expect(calledArg).toBeInstanceOf(HeadObjectCommand);
    });

    it('should return false when object does not exist', async () => {
      mockSend.mockRejectedValue(new Error('NotFound'));
      const result = await service.exists('non-existent.json');
      expect(result).toBe(false);
    });
  });
});
