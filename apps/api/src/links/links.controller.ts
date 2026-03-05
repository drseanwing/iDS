import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LinksService } from './links.service';
import { LinkSectionReferenceDto } from './dto/link-section-reference.dto';
import { LinkSectionPicoDto } from './dto/link-section-pico.dto';
import { LinkSectionRecommendationDto } from './dto/link-section-recommendation.dto';
import { LinkPicoRecommendationDto } from './dto/link-pico-recommendation.dto';
import { LinkOutcomeReferenceDto } from './dto/link-outcome-reference.dto';

@ApiTags('Links')
@ApiBearerAuth()
@Controller('links')
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  // ── SectionReference ─────────────────────────────────────

  @Post('section-references')
  @ApiOperation({ summary: 'Link a reference to a section' })
  linkSectionReference(@Body() dto: LinkSectionReferenceDto) {
    return this.linksService.linkSectionReference(dto);
  }

  @Delete('section-references/:sectionId/:referenceId')
  @ApiOperation({ summary: 'Unlink a reference from a section' })
  unlinkSectionReference(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Param('referenceId', ParseUUIDPipe) referenceId: string,
  ) {
    return this.linksService.unlinkSectionReference(sectionId, referenceId);
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
  linkSectionPico(@Body() dto: LinkSectionPicoDto) {
    return this.linksService.linkSectionPico(dto);
  }

  @Delete('section-picos/:sectionId/:picoId')
  @ApiOperation({ summary: 'Unlink a PICO from a section' })
  unlinkSectionPico(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Param('picoId', ParseUUIDPipe) picoId: string,
  ) {
    return this.linksService.unlinkSectionPico(sectionId, picoId);
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
  linkSectionRecommendation(@Body() dto: LinkSectionRecommendationDto) {
    return this.linksService.linkSectionRecommendation(dto);
  }

  @Delete('section-recommendations/:sectionId/:recommendationId')
  @ApiOperation({ summary: 'Unlink a recommendation from a section' })
  unlinkSectionRecommendation(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Param('recommendationId', ParseUUIDPipe) recommendationId: string,
  ) {
    return this.linksService.unlinkSectionRecommendation(
      sectionId,
      recommendationId,
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
  linkPicoRecommendation(@Body() dto: LinkPicoRecommendationDto) {
    return this.linksService.linkPicoRecommendation(dto);
  }

  @Delete('pico-recommendations/:picoId/:recommendationId')
  @ApiOperation({ summary: 'Unlink a recommendation from a PICO' })
  unlinkPicoRecommendation(
    @Param('picoId', ParseUUIDPipe) picoId: string,
    @Param('recommendationId', ParseUUIDPipe) recommendationId: string,
  ) {
    return this.linksService.unlinkPicoRecommendation(
      picoId,
      recommendationId,
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
  linkOutcomeReference(@Body() dto: LinkOutcomeReferenceDto) {
    return this.linksService.linkOutcomeReference(dto);
  }

  @Delete('outcome-references/:outcomeId/:referenceId')
  @ApiOperation({ summary: 'Unlink a reference from an outcome' })
  unlinkOutcomeReference(
    @Param('outcomeId', ParseUUIDPipe) outcomeId: string,
    @Param('referenceId', ParseUUIDPipe) referenceId: string,
  ) {
    return this.linksService.unlinkOutcomeReference(outcomeId, referenceId);
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
