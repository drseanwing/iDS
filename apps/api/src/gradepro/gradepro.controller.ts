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
import { GradeProParserService } from './gradepro-parser.service';
import { GradeProImportService } from './gradepro-import.service';
import { MAX_FILE_SIZE } from '../common/file-validation';

const GRADEPRO_MAX_SIZE = MAX_FILE_SIZE; // 10 MB

@ApiTags('GradePro Import')
@ApiBearerAuth()
@UseGuards(RbacGuard)
@Controller('guidelines/:guidelineId/gradepro')
export class GradeProController {
  constructor(
    private readonly parser: GradeProParserService,
    private readonly importer: GradeProImportService,
  ) {}

  /**
   * Upload a GradePro JSON export and import PICO/outcome/recommendation
   * records directly into the specified guideline.
   */
  @Post('import')
  @Roles('ADMIN', 'AUTHOR')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: GRADEPRO_MAX_SIZE } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiParam({ name: 'guidelineId', type: 'string', format: 'uuid' })
  @ApiOperation({ summary: 'Import a GradePro JSON export into a guideline' })
  async importFile(
    @Param('guidelineId', ParseUUIDPipe) guidelineId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const raw = file.buffer.toString('utf-8');
    const parsed = this.parser.parseGradeProJson(raw);
    const result = await this.importer.importToGuideline(guidelineId, parsed);
    return result;
  }
}
