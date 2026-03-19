import { BadRequestException } from '@nestjs/common';
import {
  FileValidationPipe,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  verifyMagicBytes,
} from './file-validation';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'test.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]), // %PDF-
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('MAX_FILE_SIZE', () => {
  it('is 10 MB', () => {
    expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
  });
});

describe('ALLOWED_MIME_TYPES', () => {
  const expectedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/csv',
    'application/csv',
    'application/xml',
    'text/xml',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/tiff',
  ];

  it.each(expectedTypes)('includes %s', (mimeType) => {
    expect(ALLOWED_MIME_TYPES.has(mimeType)).toBe(true);
  });

  it('rejects application/octet-stream', () => {
    expect(ALLOWED_MIME_TYPES.has('application/octet-stream')).toBe(false);
  });

  it('rejects text/html', () => {
    expect(ALLOWED_MIME_TYPES.has('text/html')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// verifyMagicBytes
// ---------------------------------------------------------------------------

describe('verifyMagicBytes', () => {
  describe('PDF', () => {
    it('accepts valid PDF magic bytes', () => {
      const buf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
      expect(verifyMagicBytes(buf, 'application/pdf')).toBe(true);
    });

    it('rejects mismatched magic bytes declared as PDF', () => {
      const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG bytes
      expect(verifyMagicBytes(buf, 'application/pdf')).toBe(false);
    });
  });

  describe('PNG', () => {
    it('accepts valid PNG magic bytes', () => {
      const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(verifyMagicBytes(buf, 'image/png')).toBe(true);
    });
  });

  describe('JPEG', () => {
    it('accepts valid JPEG magic bytes', () => {
      const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      expect(verifyMagicBytes(buf, 'image/jpeg')).toBe(true);
    });
  });

  describe('GIF', () => {
    it('accepts GIF89a magic bytes', () => {
      const buf = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
      expect(verifyMagicBytes(buf, 'image/gif')).toBe(true);
    });
  });

  describe('text-based types', () => {
    it('always passes for text/csv regardless of content', () => {
      const buf = Buffer.from('id,name\n1,foo\n');
      expect(verifyMagicBytes(buf, 'text/csv')).toBe(true);
    });

    it('always passes for application/xml regardless of content', () => {
      const buf = Buffer.from('<root/>');
      expect(verifyMagicBytes(buf, 'application/xml')).toBe(true);
    });

    it('always passes for text/xml regardless of content', () => {
      const buf = Buffer.from('<?xml version="1.0"?>');
      expect(verifyMagicBytes(buf, 'text/xml')).toBe(true);
    });

    it('always passes for application/csv regardless of content', () => {
      const buf = Buffer.from('col1,col2\n');
      expect(verifyMagicBytes(buf, 'application/csv')).toBe(true);
    });
  });

  describe('ZIP-based formats', () => {
    const pkHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);

    it('accepts DOCX (ZIP signature)', () => {
      expect(
        verifyMagicBytes(
          pkHeader,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ),
      ).toBe(true);
    });

    it('accepts XLSX (ZIP signature)', () => {
      expect(
        verifyMagicBytes(
          pkHeader,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ),
      ).toBe(true);
    });
  });

  describe('OLE2 formats', () => {
    const oleHeader = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

    it('accepts legacy DOC (OLE2 signature)', () => {
      expect(verifyMagicBytes(oleHeader, 'application/msword')).toBe(true);
    });

    it('accepts legacy XLS (OLE2 signature)', () => {
      expect(verifyMagicBytes(oleHeader, 'application/vnd.ms-excel')).toBe(true);
    });
  });

  describe('too-short buffers', () => {
    it('does not throw for very short buffer with known type', () => {
      const buf = Buffer.from([0x25]); // only 1 byte
      // PDF requires 4 bytes; no signature matches → rejected for binary type
      expect(verifyMagicBytes(buf, 'application/pdf')).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// FileValidationPipe
// ---------------------------------------------------------------------------

describe('FileValidationPipe', () => {
  let pipe: FileValidationPipe;

  beforeEach(() => {
    pipe = new FileValidationPipe();
  });

  it('passes a valid PDF file through', () => {
    const file = makeFile();
    expect(pipe.transform(file)).toBe(file);
  });

  it('throws BadRequestException when no file is provided', () => {
    expect(() => pipe.transform(null as any)).toThrow(BadRequestException);
    expect(() => pipe.transform(undefined as any)).toThrow(BadRequestException);
  });

  it('throws BadRequestException when file is too large', () => {
    const file = makeFile({ size: MAX_FILE_SIZE + 1 });
    expect(() => pipe.transform(file)).toThrow(BadRequestException);
    expect(() => pipe.transform(file)).toThrow(/exceeds the maximum allowed size/i);
  });

  it('accepts a file exactly at the size limit', () => {
    const pdfBytes = Buffer.alloc(MAX_FILE_SIZE, 0x00);
    pdfBytes[0] = 0x25; pdfBytes[1] = 0x50; pdfBytes[2] = 0x44; pdfBytes[3] = 0x46;
    const file = makeFile({ size: MAX_FILE_SIZE, buffer: pdfBytes });
    expect(() => pipe.transform(file)).not.toThrow();
  });

  it('throws BadRequestException for disallowed MIME type', () => {
    const file = makeFile({ mimetype: 'application/octet-stream' });
    expect(() => pipe.transform(file)).toThrow(BadRequestException);
    expect(() => pipe.transform(file)).toThrow(/not allowed/i);
  });

  it('throws BadRequestException when magic bytes mismatch declared type', () => {
    // Buffer contains PNG bytes but claimed as PDF
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const file = makeFile({ mimetype: 'application/pdf', buffer: pngBytes });
    expect(() => pipe.transform(file)).toThrow(BadRequestException);
    expect(() => pipe.transform(file)).toThrow(/does not match/i);
  });

  it('skips magic-bytes check when buffer is empty', () => {
    const file = makeFile({ buffer: Buffer.alloc(0), mimetype: 'text/csv' });
    expect(() => pipe.transform(file)).not.toThrow();
  });

  it('accepts all whitelisted MIME types (text/csv, text/xml)', () => {
    const csvFile = makeFile({
      mimetype: 'text/csv',
      buffer: Buffer.from('a,b\n1,2\n'),
      originalname: 'data.csv',
    });
    expect(() => pipe.transform(csvFile)).not.toThrow();

    const xmlFile = makeFile({
      mimetype: 'text/xml',
      buffer: Buffer.from('<root/>'),
      originalname: 'data.xml',
    });
    expect(() => pipe.transform(xmlFile)).not.toThrow();
  });
});
