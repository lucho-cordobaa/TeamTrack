import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { RecordAttendanceDto } from './dto/record-attendance.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  record(@CurrentUser() user: any, @Body() dto: RecordAttendanceDto) {
    return this.attendanceService.record(user, dto);
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
