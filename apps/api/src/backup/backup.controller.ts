import {
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { BackupService, BackupStatus } from './backup.service';
import { RbacGuard } from '../auth/rbac.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Backup')
@ApiBearerAuth()
@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get('status')
  @ApiOperation({
    summary: 'Get backup status',
    description:
      'Returns the last backup time, status, and next scheduled run. ' +
      'Accessible by all authenticated users.',
  })
  @ApiResponse({ status: 200, description: 'Current backup status' })
  getStatus(): BackupStatus {
    return this.backupService.getStatus();
  }

  @Post('trigger')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(RbacGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Manually trigger a backup (ADMIN only)',
    description:
      'Runs a PostgreSQL backup immediately in the background. ' +
      'Returns 202 Accepted; poll GET /backup/status for result.',
  })
  @ApiResponse({ status: 202, description: 'Backup triggered' })
  @ApiResponse({ status: 403, description: 'Forbidden – ADMIN role required' })
  triggerBackup(): { message: string; triggeredAt: string } {
    // Fire-and-forget; result visible via getStatus()
    this.backupService.runBackup().catch(() => {
      // error already logged in service
    });

    return {
      message: 'Backup triggered. Poll GET /backup/status for result.',
      triggeredAt: new Date().toISOString(),
    };
  }
}
