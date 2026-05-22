import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search users by email or display name' })
  @ApiQuery({ name: 'q', required: true, description: 'Search substring (min 2 chars)' })
  search(@Query('q') q: string) {
    return this.usersService.search(q);
  }
}
