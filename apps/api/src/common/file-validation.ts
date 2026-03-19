import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

/**
 * Maximum allowed file size: 10 MB
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Whitelisted MIME types for file uploads.
 */
export const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set([
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Spreadsheets / data
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // XML
  'application/xml',
  'text/xml',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/tiff',
]);

/**
 * Magic-byte signatures used for content-type verification.
 * Each entry maps to the MIME types it is consistent with.
 */
interface MagicEntry {
  offset: number;
  bytes: number[];
  mimeTypes: string[];
}

const MAGIC_SIGNATURES: MagicEntry[] = [
  // PDF: %PDF
  { offset: 0, bytes: [0x25, 0x50, 0x44, 0x46], mimeTypes: ['application/pdf'] },
  // PNG
  { offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], mimeTypes: ['image/png'] },
  // JPEG: FF D8 FF
  { offset: 0, bytes: [0xff, 0xd8, 0xff], mimeTypes: ['image/jpeg'] },
  // GIF87a / GIF89a
  { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38], mimeTypes: ['image/gif'] },
  // TIFF (little-endian): II
  { offset: 0, bytes: [0x49, 0x49, 0x2a, 0x00], mimeTypes: ['image/tiff'] },
  // TIFF (big-endian): MM
  { offset: 0, bytes: [0x4d, 0x4d, 0x00, 0x2a], mimeTypes: ['image/tiff'] },
  // WebP: RIFF????WEBP
  { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46], mimeTypes: ['image/webp'] },
  // ZIP-based formats (DOCX, XLSX): PK\x03\x04
  {
    offset: 0,
    bytes: [0x50, 0x4b, 0x03, 0x04],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip',
    ],
  },
  // Legacy DOC / XLS: D0 CF 11 E0 (OLE2)
  {
    offset: 0,
    bytes: [0xd0, 0xcf, 0x11, 0xe0],
    mimeTypes: ['application/msword', 'application/vnd.ms-excel'],
  },
];

/**
 * Verifies that the buffer's magic bytes are consistent with the declared MIME type.
 *
 * For plain-text types (CSV, XML) no magic-byte check is performed; the declared
 * MIME type is trusted. For binary types, at least one signature must match.
 *
 * Returns true when the check passes, false when a mismatch is detected.
 */
export function verifyMagicBytes(buffer: Buffer, declaredMimeType: string): boolean {
  const textTypes = new Set([
    'text/csv',
    'application/csv',
    'application/xml',
    'text/xml',
  ]);

  if (textTypes.has(declaredMimeType)) {
    return true; // cannot reliably verify text files by magic bytes
  }

  for (const entry of MAGIC_SIGNATURES) {
    if (buffer.length < entry.offset + entry.bytes.length) continue;

    let match = true;
    for (let i = 0; i < entry.bytes.length; i++) {
      if (buffer[entry.offset + i] !== entry.bytes[i]) {
        match = false;
        break;
      }
    }

    if (match) {
      // The buffer has this signature — check the declared type is compatible.
      return entry.mimeTypes.includes(declaredMimeType);
    }
  }

  // No signature matched. For types that should have a known signature, reject.
  // For types not in our signature list, allow (conservative fallback).
  const typesRequiringSignature = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/tiff',
    'image/webp',
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]);

  return !typesRequiringSignature.has(declaredMimeType);
}

/**
 * NestJS pipe that validates an uploaded file's size and MIME type (including
 * magic-byte content-type verification).
 *
 * Usage:
 * ```ts
 * @UploadedFile(new FileValidationPipe()) file: Express.Multer.File
 * ```
 */
@Injectable()
export class FileValidationPipe implements PipeTransform {
  transform(file: Express.Multer.File): Express.Multer.File {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Size check
    if (file.size > MAX_FILE_SIZE) {
      const limitMb = MAX_FILE_SIZE / (1024 * 1024);
      throw new BadRequestException(
        `File size ${(file.size / (1024 * 1024)).toFixed(2)} MB exceeds the maximum allowed size of ${limitMb} MB`,
      );
    }

    // MIME type whitelist check
    const mimeType = (file.mimetype ?? '').toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException(
        `File type "${mimeType}" is not allowed. Accepted types: ${[...ALLOWED_MIME_TYPES].join(', ')}`,
      );
    }

    // Magic bytes verification
    if (file.buffer && file.buffer.length > 0) {
      if (!verifyMagicBytes(file.buffer, mimeType)) {
        throw new BadRequestException(
          'File content does not match the declared content type. The upload has been rejected.',
        );
      }
    }

    return file;
  }
}
