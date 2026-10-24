import { IsArray, IsInt, IsOptional } from 'class-validator';

export class AssignRoutineDto {
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  atleta_ids?: number[];

  @IsOptional()
  @IsInt()
  equipo_id?: number;
}
