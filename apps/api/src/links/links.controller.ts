import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LinksService } from './links.service';
import { LinkSectionReferenceDto } from './dto/link-section-reference.dto';
import { LinkSectionPicoDto } from './dto/link-section-pico.dto';
import { LinkSectionRecommendationDto } from './dto/link-section-recommendation.dto';
import { LinkPicoRecommendationDto } from './dto/link-pico-recommendation.dto';
import { LinkOutcomeReferenceDto } from './dto/link-outcome-reference.dto';
import { RbacGuard } from '../auth/rbac.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Links')
@ApiBearerAuth()
@UseGuards(RbacGuard)
@Roles('EDITOR', 'ADMIN')
@Controller('links')
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  // ── SectionReference ─────────────────────────────────────

  @Post('section-references')
  @ApiOperation({ summary: 'Link a reference to a section' })
  @ApiQuery({ name: 'guidelineId', required: true })
  linkSectionReference(
    @Body() dto: LinkSectionReferenceDto,
    @Query('guidelineId') guidelineId: string,
  ) {
    return this.linksService.linkSectionReference(dto, guidelineId);
  }

  @Delete('section-references/:sectionId/:referenceId')
  @ApiOperation({ summary: 'Unlink a reference from a section' })
  @ApiQuery({ name: 'guidelineId', required: true })
  unlinkSectionReference(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Param('referenceId', ParseUUIDPipe) referenceId: string,
    @Query('guidelineId') guidelineId: string,
  ) {
    return this.linksService.unlinkSectionReference(sectionId, referenceId, guidelineId);
  }

  @Get('section-references')
  @ApiOperation({ summary: 'List references linked to a section' })
  @ApiQuery({ name: 'sectionId', required: true })
  listSectionReferences(
    @Query('sectionId', ParseUUIDPipe) sectionId: string,
  ) {
    return this.linksService.listSectionReferences(sectionId);
  }

  // ── SectionPico ──────────────────────────────────────────

  @Post('section-picos')
  @ApiOperation({ summary: 'Link a PICO to a section' })
  @ApiQuery({ name: 'guidelineId', required: true })
  linkSectionPico(
    @Body() dto: LinkSectionPicoDto,
    @Query('guidelineId') guidelineId: string,
  ) {
    return this.linksService.linkSectionPico(dto, guidelineId);
  }

  @Delete('section-picos/:sectionId/:picoId')
  @ApiOperation({ summary: 'Unlink a PICO from a section' })
  @ApiQuery({ name: 'guidelineId', required: true })
  unlinkSectionPico(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Param('picoId', ParseUUIDPipe) picoId: string,
    @Query('guidelineId') guidelineId: string,
  ) {
    return this.linksService.unlinkSectionPico(sectionId, picoId, guidelineId);
  }

  @Get('section-picos')
  @ApiOperation({ summary: 'List PICOs linked to a section' })
  @ApiQuery({ name: 'sectionId', required: true })
  listSectionPicos(
    @Query('sectionId', ParseUUIDPipe) sectionId: string,
  ) {
    return this.linksService.listSectionPicos(sectionId);
  }

  // ── SectionRecommendation ────────────────────────────────

  @Post('section-recommendations')
  @ApiOperation({ summary: 'Link a recommendation to a section' })
  @ApiQuery({ name: 'guidelineId', required: true })
  linkSectionRecommendation(
    @Body() dto: LinkSectionRecommendationDto,
    @Query('guidelineId') guidelineId: string,
  ) {
    return this.linksService.linkSectionRecommendation(dto, guidelineId);
  }

  @Delete('section-recommendations/:sectionId/:recommendationId')
  @ApiOperation({ summary: 'Unlink a recommendation from a section' })
  @ApiQuery({ name: 'guidelineId', required: true })
  unlinkSectionRecommendation(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Param('recommendationId', ParseUUIDPipe) recommendationId: string,
    @Query('guidelineId') guidelineId: string,
  ) {
    return this.linksService.unlinkSectionRecommendation(
      sectionId,
      recommendationId,
      guidelineId,
    );
  }

  @Get('section-recommendations')
  @ApiOperation({ summary: 'List recommendations linked to a section' })
  @ApiQuery({ name: 'sectionId', required: true })
  listSectionRecommendations(
    @Query('sectionId', ParseUUIDPipe) sectionId: string,
  ) {
    return this.linksService.listSectionRecommendations(sectionId);
  }

  // ── PicoRecommendation ───────────────────────────────────

  @Post('pico-recommendations')
  @ApiOperation({ summary: 'Link a recommendation to a PICO' })
  @ApiQuery({ name: 'guidelineId', required: true })
  linkPicoRecommendation(
    @Body() dto: LinkPicoRecommendationDto,
    @Query('guidelineId') guidelineId: string,
  ) {
    return this.linksService.linkPicoRecommendation(dto, guidelineId);
  }

  @Delete('pico-recommendations/:picoId/:recommendationId')
  @ApiOperation({ summary: 'Unlink a recommendation from a PICO' })
  @ApiQuery({ name: 'guidelineId', required: true })
  unlinkPicoRecommendation(
    @Param('picoId', ParseUUIDPipe) picoId: string,
    @Param('recommendationId', ParseUUIDPipe) recommendationId: string,
    @Query('guidelineId') guidelineId: string,
  ) {
    return this.linksService.unlinkPicoRecommendation(
      picoId,
      recommendationId,
      guidelineId,
    );
  }

  @Get('pico-recommendations')
  @ApiOperation({ summary: 'List recommendations linked to a PICO' })
  @ApiQuery({ name: 'picoId', required: true })
  listPicoRecommendations(
    @Query('picoId', ParseUUIDPipe) picoId: string,
  ) {
    return this.linksService.listPicoRecommendations(picoId);
  }

  // ── OutcomeReference ─────────────────────────────────────

  @Post('outcome-references')
  @ApiOperation({ summary: 'Link a reference to an outcome' })
  @ApiQuery({ name: 'guidelineId', required: true })
  linkOutcomeReference(
    @Body() dto: LinkOutcomeReferenceDto,
    @Query('guidelineId') guidelineId: string,
  ) {
    return this.linksService.linkOutcomeReference(dto, guidelineId);
  }

  @Delete('outcome-references/:outcomeId/:referenceId')
  @ApiOperation({ summary: 'Unlink a reference from an outcome' })
  @ApiQuery({ name: 'guidelineId', required: true })
  unlinkOutcomeReference(
    @Param('outcomeId', ParseUUIDPipe) outcomeId: string,
    @Param('referenceId', ParseUUIDPipe) referenceId: string,
    @Query('guidelineId') guidelineId: string,
  ) {
    return this.linksService.unlinkOutcomeReference(outcomeId, referenceId, guidelineId);
  }

  @Get('outcome-references')
  @ApiOperation({ summary: 'List references linked to an outcome' })
  @ApiQuery({ name: 'outcomeId', required: true })
  listOutcomeReferences(
    @Query('outcomeId', ParseUUIDPipe) outcomeId: string,
  ) {
    return this.linksService.listOutcomeReferences(outcomeId);
  }
}
