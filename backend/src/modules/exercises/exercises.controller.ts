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
import { ExercisesService } from './exercises.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Rol } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('muscleGroup') muscleGroup?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.exercisesService.findAll(
      search,
      muscleGroup,
      page ? Number.parseInt(page, 10) : undefined,
      pageSize ? Number.parseInt(pageSize, 10) : undefined,
    );
  }

  @Get('muscle-groups')
  getMuscleGroups() {
    return this.exercisesService.getMuscleGroups();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.exercisesService.findOne(id);
  }

  @Roles(Rol.ENTRENADOR)
  @Post()
  create(@Body() dto: CreateExerciseDto) {
    return this.exercisesService.create(dto);
  }

  @Roles(Rol.ENTRENADOR)
  @Post('import')
  importDataset(@Body() items: CreateExerciseDto[]) {
    return this.exercisesService.importDataset(items);
  }
}
