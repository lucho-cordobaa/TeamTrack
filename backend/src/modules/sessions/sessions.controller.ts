import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { StartSessionDto } from './dto/start-session.dto';
import { UpdateSetDto } from './dto/update-set.dto';
import { FinishSessionDto } from './dto/finish-session.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Rol } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Roles(Rol.ATLETA)
  @Post('start')
  start(@CurrentUser('id') athleteId: number, @Body() dto: StartSessionDto) {
    return this.sessionsService.start(athleteId, dto);
  }

  @Roles(Rol.ATLETA)
  @Get('active')
  getActive(@CurrentUser('id') athleteId: number) {
    return this.sessionsService.getActive(athleteId);
  }

  @Roles(Rol.ATLETA)
  @Patch(':id/set')
  updateSet(
    @CurrentUser('id') athleteId: number,
    @Param('id') sessionId: string,
    @Body() dto: UpdateSetDto,
  ) {
    return this.sessionsService.updateSet(athleteId, sessionId, dto);
  }

  @Roles(Rol.ATLETA)
  @Post(':id/finish')
  finish(
    @CurrentUser('id') athleteId: number,
    @Param('id') sessionId: string,
    @Body() dto: FinishSessionDto,
  ) {
    return this.sessionsService.finish(athleteId, sessionId, dto);
  }

  @Roles(Rol.ENTRENADOR)
  @Get('team/:teamId/live')
  getActiveTeamSessions(
    @CurrentUser('id') coachId: number,
    @Param('teamId', ParseIntPipe) teamId: number,
  ) {
    return this.sessionsService.getActiveTeamSessions(coachId, teamId);
  }
}
