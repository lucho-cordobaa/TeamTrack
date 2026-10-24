import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ProgressService } from './progress.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Rol } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get('athlete/:athleteId/exercise/:exerciseId')
  getExerciseWeightHistory(
    @Param('athleteId', ParseIntPipe) athleteId: number,
    @Param('exerciseId', ParseIntPipe) exerciseId: number,
    @CurrentUser() user: any,
  ) {
    return this.progressService.getExerciseWeightHistory(athleteId, exerciseId, user);
  }

  @Get('athlete/:athleteId/summary')
  getAthleteSummary(
    @Param('athleteId', ParseIntPipe) athleteId: number,
    @CurrentUser() user: any,
  ) {
    return this.progressService.getAthleteSummary(athleteId, user);
  }

  @Roles(Rol.ENTRENADOR)
  @Get('team/:teamId')
  getTeamProgress(
    @Param('teamId', ParseIntPipe) teamId: number,
    @CurrentUser('id') coachId: number,
  ) {
    return this.progressService.getTeamProgress(teamId, coachId);
  }
}
