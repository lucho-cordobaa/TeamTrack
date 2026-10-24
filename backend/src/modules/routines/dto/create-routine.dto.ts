import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoRutina } from '@prisma/client';

export class RoutineExerciseDto {
  @IsInt()
  @IsNotEmpty()
  ejercicio_id: number;

  @IsInt()
  @Min(1)
  series: number;

  @IsInt()
  @Min(1)
  repeticiones: number;

  @IsInt()
  @Min(1)
  orden: number;
}

export class CreateRoutineDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre de la rutina es obligatorio' })
  nombre: string;

  @IsEnum(TipoRutina, { message: 'El tipo debe ser INDIVIDUAL o GRUPAL' })
  tipo: TipoRutina;

  @IsOptional()
  @IsInt()
  equipo_origen_id?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutineExerciseDto)
  ejercicios: RoutineExerciseDto[];
}
