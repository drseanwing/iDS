import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  ParseUUIDPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Res,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { InternalDocumentsService } from './internal-documents.service';
import { RbacGuard } from '../auth/rbac.guard';
import { Roles } from '../auth/roles.decorator';
import { FileValidationPipe, MAX_FILE_SIZE } from '../common/file-validation';

@ApiTags('Internal Documents')
@ApiBearerAuth()
@UseGuards(RbacGuard)
@Controller('guidelines/:guidelineId/documents')
export class InternalDocumentsController {
  constructor(private readonly internalDocumentsService: InternalDocumentsService) {}

  @Post()
  @Roles('ADMIN', 'AUTHOR')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload an internal document for a guideline' })
  upload(
    @Param('guidelineId', ParseUUIDPipe) guidelineId: string,
    @UploadedFile(new FileValidationPipe()) file: Express.Multer.File,
    @Body('title') title: string | undefined,
    @Req() req: any,
  ) {
    const uploadedBy: string = req.user?.sub ?? '00000000-0000-0000-0000-000000000001';
    return this.internalDocumentsService.upload(guidelineId, file, title, uploadedBy);
  }

  @Get()
  @ApiOperation({ summary: 'List internal documents for a guideline' })
  findAll(@Param('guidelineId', ParseUUIDPipe) guidelineId: string) {
    return this.internalDocumentsService.findAll(guidelineId);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download an internal document' })
  async download(
    @Param('guidelineId', ParseUUIDPipe) guidelineId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { buffer, mimeType, fileName } = await this.internalDocumentsService.download(
      guidelineId,
      id,
    );
    const asciiName = fileName.replace(/[^\x20-\x7E]/g, '_');
    const encodedName = encodeURIComponent(fileName);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
    );
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  @Delete(':id')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Delete an internal document' })
  async remove(
    @Param('guidelineId', ParseUUIDPipe) guidelineId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.internalDocumentsService.remove(guidelineId, id);
    return { message: 'Document deleted' };
  }
}
