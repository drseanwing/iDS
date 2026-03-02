import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from './public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@Req() req: any) {
    return {
      sub: req.user?.sub,
      email: req.user?.email,
      name: req.user?.name,
      roles: req.user?.roles,
    };
  }

  @Get('status')
  @Public()
  @ApiOperation({ summary: 'Check authentication service status' })
  getStatus() {
    return {
      status: 'ok',
      provider: 'keycloak',
    };
  }
}
