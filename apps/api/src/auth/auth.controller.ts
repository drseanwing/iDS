import { Controller, Get, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Public } from './public.decorator';

@ApiTags('Auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  @Get('me')
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      'Returns the authenticated user\'s profile information decoded from the JWT bearer token, including their Keycloak subject ID, email, name, and assigned roles.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        sub: { type: 'string', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
        email: { type: 'string', example: 'jane.doe@hospital.org' },
        name: { type: 'string', example: 'Jane Doe' },
        roles: { type: 'array', items: { type: 'string' }, example: ['AUTHOR'] },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized – missing or invalid bearer token' })
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
  @ApiOperation({
    summary: 'Check authentication service status',
    description: 'Returns the current authentication provider and service status. This endpoint is public and does not require a bearer token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication service is operational',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        provider: { type: 'string', example: 'keycloak' },
      },
    },
  })
  getStatus() {
    return {
      status: 'ok',
      provider: 'keycloak',
    };
  }
}
