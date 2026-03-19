import {
  Controller,
  Post,
  Body,
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
} from '@nestjs/swagger';
import { RbacGuard } from '../auth/rbac.guard';
import { Roles } from '../auth/roles.decorator';
import { RevmanParserService } from './revman-parser.service';
import { RevmanImportService } from './revman-import.service';
import { ImportRevManDto } from './dto/import-revman.dto';
import { MAX_FILE_SIZE } from '../common/file-validation';

const RM5_MAX_SIZE = MAX_FILE_SIZE; // 10 MB

@ApiTags('RevMan Import')
@ApiBearerAuth()
@UseGuards(RbacGuard)
@Controller('revman')
export class RevmanController {
  constructor(
    private readonly parser: RevmanParserService,
    private readonly importer: RevmanImportService,
  ) {}

  /**
   * Upload an .rm5 file and receive a parsed preview of comparisons/outcomes.
   * No data is written to the database at this stage.
   */
  @Post('parse')
  @Roles('ADMIN', 'AUTHOR')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: RM5_MAX_SIZE } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Parse an .rm5 RevMan file and return a structured preview' })
  parseFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const xml = file.buffer.toString('utf-8');
    const parsed = this.parser.parseRevManXml(xml);
    return { data: parsed };
  }

  /**
   * Import previously-parsed RevMan data into the database.
   * Creates Outcome records linked to the specified PICO/guideline.
   */
  @Post('import')
  @Roles('ADMIN', 'AUTHOR')
  @ApiOperation({ summary: 'Import RevMan comparisons as Outcome records' })
  async importData(@Body() dto: ImportRevManDto) {
    const result = await this.importer.importToGuideline(
      dto.guidelineId,
      dto.picoId,
      { title: 'RevMan Import', comparisons: dto.comparisons as any },
    );
    return result;
  }
}
