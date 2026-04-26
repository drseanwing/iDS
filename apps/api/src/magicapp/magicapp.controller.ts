import {
  Controller,
  Post,
  Param,
  ParseUUIDPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { RbacGuard } from '../auth/rbac.guard';
import { Roles } from '../auth/roles.decorator';
import { MagicAppParserService } from './magicapp-parser.service';
import { MagicAppImportService } from './magicapp-import.service';
import { MAX_FILE_SIZE } from '../common/file-validation';

const MAGICAPP_MAX_SIZE = MAX_FILE_SIZE; // 10 MB

@ApiTags('MagicApp Import')
@ApiBearerAuth()
@UseGuards(RbacGuard)
@Controller('guidelines/:guidelineId/magicapp')
export class MagicAppController {
  constructor(
    private readonly parser: MagicAppParserService,
    private readonly importer: MagicAppImportService,
  ) {}

  /**
   * Upload a MagicApp JSON export and import section/recommendation/reference
   * records directly into the specified guideline.
   */
  @Post('import')
  @Roles('ADMIN', 'AUTHOR')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAGICAPP_MAX_SIZE } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiParam({ name: 'guidelineId', type: 'string', format: 'uuid' })
  @ApiOperation({ summary: 'Import a MagicApp JSON export into a guideline' })
  async importFile(
    @Param('guidelineId', ParseUUIDPipe) guidelineId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const raw = file.buffer.toString('utf-8');
    const parsed = this.parser.parse(raw);
    const result = await this.importer.importToGuideline(guidelineId, parsed);
    return result;
  }
}
