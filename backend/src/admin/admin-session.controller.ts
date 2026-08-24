import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { type AdminRequest, AdminSessionGuard } from './admin-session.guard';
import { AdminSessionService } from './admin-session.service';
import { CreateAdminSessionDto } from './dto/create-admin-session.dto';
import { AdminRole } from '@prisma/client';
import { AdminRoles } from './admin-authorization';

@Controller('admin/session')
export class AdminSessionController {
  constructor(private readonly sessions: AdminSessionService) {}

  @Post()
  @HttpCode(200)
  async create(
    @Body() dto: CreateAdminSessionDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.sessions.create(dto, {
      ip: request.ip,
      userAgent: request.header('user-agent'),
    });
    response.setHeader(
      'Set-Cookie',
      this.sessions.sessionCookie(session.token),
    );
    return {
      authenticated: true,
      expiresAt: session.expiresAt,
      user: session.user,
    };
  }

  @Get()
  async read(@Req() request: Request) {
    try {
      const user = await this.sessions.verify(
        this.sessions.readCookie(request.header('cookie')),
      );
      return { authenticated: true as const, user };
    } catch {
      return { authenticated: false as const };
    }
  }

  @Get('active')
  @UseGuards(AdminSessionGuard)
  @AdminRoles(AdminRole.RECEPTIONIST, AdminRole.PROFESSIONAL)
  active(@Req() request: AdminRequest) {
    return this.sessions.listActive(request.adminIdentity!);
  }

  @Delete('active/:id')
  @UseGuards(AdminSessionGuard)
  @AdminRoles(AdminRole.RECEPTIONIST, AdminRole.PROFESSIONAL)
  @HttpCode(200)
  revoke(@Req() request: AdminRequest, @Param('id') id: string) {
    return this.sessions.revokeSession(request.adminIdentity!, id);
  }

  @Delete()
  @UseGuards(AdminSessionGuard)
  @AdminRoles(AdminRole.RECEPTIONIST, AdminRole.PROFESSIONAL)
  @HttpCode(200)
  async remove(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.sessions.revoke(
      this.sessions.readCookie(request.header('cookie')),
    );
    response.setHeader('Set-Cookie', this.sessions.clearCookie());
    return { authenticated: false };
  }
}
