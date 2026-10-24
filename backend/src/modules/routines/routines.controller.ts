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
import { RoutinesService } from './routines.service';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { AssignRoutineDto } from './dto/assign-routine.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Rol } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('routines')
export class RoutinesController {
  constructor(private readonly routinesService: RoutinesService) {}

  @Roles(Rol.ENTRENADOR)
  @Post()
  create(@CurrentUser('id') coachId: number, @Body() dto: CreateRoutineDto) {
    return this.routinesService.create(coachId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.routinesService.findAllForUser(user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.routinesService.findOne(id, user);
  }

  @Roles(Rol.ENTRENADOR)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') coachId: number,
    @Body() dto: CreateRoutineDto,
  ) {
    return this.routinesService.update(id, coachId, dto);
  }

  @Roles(Rol.ENTRENADOR)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') coachId: number) {
    return this.routinesService.remove(id, coachId);
  }

  @Roles(Rol.ENTRENADOR)
  @Post(':id/assign')
  assign(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') coachId: number,
    @Body() dto: AssignRoutineDto,
  ) {
    return this.routinesService.assign(id, coachId, dto);
  }

  @Roles(Rol.ENTRENADOR)
  @Delete(':id/unassign/:athleteId')
  unassign(
    @Param('id', ParseIntPipe) id: number,
    @Param('athleteId', ParseIntPipe) athleteId: number,
    @CurrentUser('id') coachId: number,
  ) {
    return this.routinesService.unassign(id, coachId, athleteId);
  }
}
