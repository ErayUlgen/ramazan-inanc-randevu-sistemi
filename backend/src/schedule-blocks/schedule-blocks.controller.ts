import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminSessionGuard } from '../admin/admin-session.guard';
import { CancelScheduleBlockDto } from './dto/cancel-schedule-block.dto';
import { CreateScheduleBlockDto } from './dto/create-schedule-block.dto';
import { UpdateScheduleBlockDto } from './dto/update-schedule-block.dto';
import { ScheduleBlocksService } from './schedule-blocks.service';
import { AdminRole } from '@prisma/client';
import { AdminRoles } from '../admin/admin-authorization';

@UseGuards(AdminSessionGuard)
@AdminRoles(AdminRole.RECEPTIONIST)
@Controller('admin/schedule-blocks')
export class ScheduleBlocksController {
  constructor(private readonly blocks: ScheduleBlocksService) {}

  @Get()
  list(@Query('branchId') branchId: string, @Query('date') date: string) {
    return this.blocks.list(branchId, date);
  }

  @Post()
  create(@Body() dto: CreateScheduleBlockDto) {
    return this.blocks.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateScheduleBlockDto) {
    return this.blocks.update(id, dto);
  }

  @Delete(':id')
  cancel(@Param('id') id: string, @Body() dto: CancelScheduleBlockDto) {
    return this.blocks.cancel(id, dto);
  }
}
