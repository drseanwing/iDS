import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class InternalDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async upload(
    guidelineId: string,
    file: Express.Multer.File,
    title: string | undefined,
    uploadedBy: string,
  ) {
    const guideline = await this.prisma.guideline.findUnique({
      where: { id: guidelineId },
      select: { id: true },
    });
    if (!guideline) {
      throw new NotFoundException(`Guideline ${guidelineId} not found`);
    }

    const fileUuid = uuidv4();
    const s3Key = `internal-docs/${guidelineId}/${fileUuid}/${file.originalname}`;
    await this.storage.upload(s3Key, file.buffer, file.mimetype);

    const documentTitle = title ?? file.originalname;

    return this.prisma.internalDocument.create({
      data: {
        guidelineId,
        title: documentTitle,
        s3Key,
        mimeType: file.mimetype,
        uploadedBy,
      },
    });
  }

  async findAll(guidelineId: string) {
    const guideline = await this.prisma.guideline.findUnique({
      where: { id: guidelineId },
      select: { id: true },
    });
    if (!guideline) {
      throw new NotFoundException(`Guideline ${guidelineId} not found`);
    }

    return this.prisma.internalDocument.findMany({
      where: { guidelineId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async download(guidelineId: string, id: string) {
    const doc = await this.prisma.internalDocument.findFirst({
      where: { id, guidelineId },
    });
    if (!doc) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    const buffer = await this.storage.download(doc.s3Key);
    return { buffer, mimeType: doc.mimeType, fileName: doc.title };
  }

  async remove(guidelineId: string, id: string) {
    const doc = await this.prisma.internalDocument.findFirst({
      where: { id, guidelineId },
    });
    if (!doc) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    await this.storage.delete(doc.s3Key);
    return this.prisma.internalDocument.delete({ where: { id } });
  }
}
