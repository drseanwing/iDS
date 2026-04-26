import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { ReferencesService } from './references.service';
import { CreateReferenceDto } from './dto/create-reference.dto';
import { UpdateReferenceDto } from './dto/update-reference.dto';
import { PaginationQueryDto } from '../common/dto';
import { RbacGuard } from '../auth/rbac.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { FileValidationPipe, MAX_FILE_SIZE } from '../common/file-validation';

@ApiTags('References')
@ApiBearerAuth()
@UseGuards(RbacGuard)
@Controller('references')
export class ReferencesController {
  constructor(private readonly referencesService: ReferencesService) {}

  @Post()
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Create a reference' })
  create(@Body() dto: CreateReferenceDto) {
    return this.referencesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List references, optionally filtered by guideline or search term' })
  @ApiQuery({ name: 'guidelineId', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('guidelineId') guidelineId?: string,
    @Query('search') search?: string,
    @Query() pagination?: PaginationQueryDto,
  ) {
    return this.referencesService.findAll(
      { guidelineId, search },
      pagination?.page,
      pagination?.limit,
    );
  }

  @Get('numbered')
  @ApiOperation({ summary: 'Get auto-numbered references for a guideline (depth-first traversal order)' })
  @ApiQuery({ name: 'guidelineId', required: true })
  async getNumbered(@Query('guidelineId', ParseUUIDPipe) guidelineId: string) {
    const numberMap = await this.referencesService.computeReferenceNumbers(guidelineId);
    const data = Array.from(numberMap.entries()).map(([referenceId, referenceNumber]) => ({
      referenceId,
      referenceNumber,
    }));
    return { data };
  }

  @Get('pubmed-lookup/:pmid')
  @Public()
  @ApiOperation({ summary: 'Fetch reference metadata from PubMed by PMID' })
  pubmedLookup(@Param('pmid') pmid: string) {
    return this.referencesService.pubmedLookup(pmid);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get reference by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.referencesService.findOne(id);
  }

  @Put(':id')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Update reference' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReferenceDto,
  ) {
    return this.referencesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Soft-delete reference' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.referencesService.softDelete(id);
  }

  // -----------------------------------------------------------------------
  // Attachments
  // -----------------------------------------------------------------------

  @Post(':id/attachments')
  @Roles('ADMIN', 'AUTHOR')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Upload a file attachment for a reference (stored in object storage)' })
  uploadAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(new FileValidationPipe()) file: Express.Multer.File,
    @Req() req: any,
  ) {
    const uploadedBy: string = req.user?.sub ?? '00000000-0000-0000-0000-000000000001';
    return this.referencesService.uploadAttachment(id, file, uploadedBy);
  }

  @Get(':id/attachments')
  @ApiOperation({ summary: 'List file attachments for a reference' })
  listAttachments(@Param('id', ParseUUIDPipe) id: string) {
    return this.referencesService.listAttachments(id);
  }

  @Get(':id/attachments/:attachmentId')
  @ApiOperation({ summary: 'Download a reference attachment' })
  async downloadAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @Res() res: Response,
  ) {
    const { buffer, fileName, mimeType } = await this.referencesService.getAttachmentDownloadBuffer(id, attachmentId);
    const asciiName = fileName.replace(/[^\x20-\x7E]/g, '_');
    const encodedName = encodeURIComponent(fileName);
    res.setHeader('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  @Delete(':id/attachments/:attachmentId')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Delete a reference attachment' })
  async deleteAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
  ) {
    await this.referencesService.deleteAttachment(id, attachmentId);
    return { message: 'Attachment deleted' };
  }
}
