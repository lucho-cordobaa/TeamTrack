import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { AssignAthleteDto } from './dto/assign-athlete.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Rol } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Roles(Rol.ENTRENADOR)
  @Post()
  create(@CurrentUser('id') coachId: number, @Body() dto: CreateTeamDto) {
    return this.teamsService.create(coachId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.teamsService.findAllForUser(user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.teamsService.findOne(id, user);
  }

  @Roles(Rol.ENTRENADOR)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') coachId: number,
    @Body() dto: CreateTeamDto,
  ) {
    return this.teamsService.update(id, coachId, dto);
  }

  @Roles(Rol.ENTRENADOR)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') coachId: number) {
    return this.teamsService.remove(id, coachId);
  }

  @Roles(Rol.ENTRENADOR)
  @Post(':id/athletes')
  addAthlete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') coachId: number,
    @Body() dto: AssignAthleteDto,
  ) {
    return this.teamsService.addAthlete(id, coachId, dto.atleta_id);
  }

  @Roles(Rol.ENTRENADOR)
  @Delete(':id/athletes/:athleteId')
  removeAthlete(
    @Param('id', ParseIntPipe) id: number,
    @Param('athleteId', ParseIntPipe) athleteId: number,
    @CurrentUser('id') coachId: number,
  ) {
    return this.teamsService.removeAthlete(id, coachId, athleteId);
  }
}
