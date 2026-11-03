import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { RecordAttendanceDto } from './dto/record-attendance.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Rol } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  record(@CurrentUser() user: any, @Body() dto: RecordAttendanceDto) {
    return this.attendanceService.record(user, dto);
  }

  @Roles(Rol.ENTRENADOR)
  @Get('week')
  getWeek(
    @CurrentUser('id') coachId: number,
    @Query('date') date: string,
    @Query('team') team: string,
  ) {
    return this.attendanceService.getWeek(coachId, date, team);
  }

  @Get('athlete/:id')
  getAthleteHistory(@Param('id', ParseIntPipe) athleteId: number, @CurrentUser() user: any) {
    return this.attendanceService.getAthleteHistory(athleteId, user);
  }

  @Get('team/:id')
  getTeamHistory(@Param('id', ParseIntPipe) teamId: number, @CurrentUser() user: any) {
    return this.attendanceService.getTeamHistory(teamId, user);
  }
}
