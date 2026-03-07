import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { TerminologyService } from './terminology.service';
import { RbacGuard } from '../auth/rbac.guard';

@ApiTags('Terminology')
@ApiBearerAuth()
@UseGuards(RbacGuard)
@Controller('terminology')
export class TerminologyController {
  constructor(private readonly terminologyService: TerminologyService) {}

  @Get('search')
  @ApiOperation({
    summary: 'Search terminology codes by system and query string',
    description:
      'Returns matching codes from a stub dataset. Supported systems: SNOMED_CT, ICD10, ATC, RXNORM.',
  })
  @ApiQuery({
    name: 'system',
    required: true,
    description: 'Terminology system (SNOMED_CT | ICD10 | ATC | RXNORM)',
    example: 'SNOMED_CT',
  })
  @ApiQuery({
    name: 'query',
    required: true,
    description: 'Case-insensitive substring to search for in code display names',
    example: 'diabetes',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of results to return (default 20)',
    example: 20,
    type: Number,
  })
  search(
    @Query('system') system: string,
    @Query('query') query: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.terminologyService.search(system, query ?? '', parsedLimit);
  }
}
