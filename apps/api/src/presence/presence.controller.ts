import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  Sse,
  MessageEvent,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Observable, interval, map } from 'rxjs';
import { Request } from 'express';
import { PresenceService } from './presence.service';
import { JoinDto, HeartbeatDto } from './dto/presence.dto';

@ApiTags('Presence')
@ApiBearerAuth()
@Controller('presence')
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  @Sse(':guidelineId/stream')
  @ApiOperation({ summary: 'SSE stream of active users for a guideline' })
  stream(
    @Param('guidelineId', ParseUUIDPipe) guidelineId: string,
  ): Observable<MessageEvent> {
    return interval(2000).pipe(
      map(() => {
        const users = this.presenceService.getPresence(guidelineId);
        return { data: users } as MessageEvent;
      }),
    );
  }

  @Post(':guidelineId/join')
  @ApiOperation({ summary: 'Join a guideline presence session' })
  join(
    @Param('guidelineId', ParseUUIDPipe) guidelineId: string,
    @Body() dto: JoinDto,
    @Req() req: Request,
  ) {
    const userId: string = (req as any).user?.sub ?? 'anonymous';
    return this.presenceService.join(guidelineId, userId, dto.userName);
  }

  @Post(':guidelineId/heartbeat')
  @ApiOperation({ summary: 'Send a heartbeat with optional current section' })
  heartbeat(
    @Param('guidelineId', ParseUUIDPipe) guidelineId: string,
    @Body() dto: HeartbeatDto,
    @Req() req: Request,
  ) {
    const userId: string = (req as any).user?.sub ?? 'anonymous';
    return this.presenceService.heartbeat(guidelineId, userId, dto.sectionId);
  }

  @Post(':guidelineId/leave')
  @ApiOperation({ summary: 'Leave a guideline presence session' })
  leave(
    @Param('guidelineId', ParseUUIDPipe) guidelineId: string,
    @Req() req: Request,
  ) {
    const userId: string = (req as any).user?.sub ?? 'anonymous';
    this.presenceService.leave(guidelineId, userId);
    return { ok: true };
  }

  @Get(':guidelineId')
  @ApiOperation({ summary: 'Snapshot of active users for a guideline' })
  getPresence(@Param('guidelineId', ParseUUIDPipe) guidelineId: string) {
    return this.presenceService.getPresence(guidelineId);
  }
}
