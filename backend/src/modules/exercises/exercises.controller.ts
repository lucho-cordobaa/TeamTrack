import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExercisesService } from './exercises.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { exerciseImageUpload, UPLOADS_URL_PREFIX } from './exercise-image.upload';
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
  @Post('upload')
  @UseInterceptors(FileInterceptor('imagen', exerciseImageUpload))
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Debes seleccionar una imagen');
    return { url: `${UPLOADS_URL_PREFIX}/exercises/${file.filename}` };
  }

  @Roles(Rol.ENTRENADOR)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateExerciseDto) {
    return this.exercisesService.update(id, dto);
  }

  @Roles(Rol.ENTRENADOR)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.exercisesService.remove(id);
  }

  @Roles(Rol.ENTRENADOR)
  @Post('import')
  importDataset(@Body() items: CreateExerciseDto[]) {
    return this.exercisesService.importDataset(items);
  }
}
