import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminSessionGuard } from './admin-session.guard';
import type { AdminRequest } from './admin-session.guard';
import { CreateTeamAccessDto } from './dto/create-team-access.dto';
import {
  ResetTeamPasswordDto,
  UpdateTeamAccessDto,
} from './dto/update-team-access.dto';
import { TeamAccessService } from './team-access.service';

@Controller('admin/team-access')
@UseGuards(AdminSessionGuard)
export class TeamAccessController {
  constructor(private readonly team: TeamAccessService) {}

  @Get()
  list(@Req() request: AdminRequest) {
    return this.team.list(request.adminIdentity!.branchId);
  }

  @Post()
  create(@Req() request: AdminRequest, @Body() dto: CreateTeamAccessDto) {
    const identity = request.adminIdentity!;
    return this.team.create(identity.branchId, identity.userId, dto);
  }

  @Patch(':id')
  update(
    @Req() request: AdminRequest,
    @Param('id') id: string,
    @Body() dto: UpdateTeamAccessDto,
  ) {
    const identity = request.adminIdentity!;
    return this.team.update(identity.branchId, identity.userId, id, dto);
  }

  @Post(':id/reset-password')
  resetPassword(
    @Req() request: AdminRequest,
    @Param('id') id: string,
    @Body() dto: ResetTeamPasswordDto,
  ) {
    const identity = request.adminIdentity!;
    return this.team.resetPassword(identity.branchId, identity.userId, id, dto);
  }

  @Delete(':id/sessions')
  revokeSessions(@Req() request: AdminRequest, @Param('id') id: string) {
    const identity = request.adminIdentity!;
    return this.team.revokeSessions(identity.branchId, identity.userId, id);
  }
}
