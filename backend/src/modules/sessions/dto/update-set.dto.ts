import { IsBoolean, IsInt, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class UpdateSetDto {
  @IsInt()
  @IsNotEmpty()
  ejercicio_id: number;

  @IsInt()
  @Min(1)
  numero_serie: number;

  @IsNumber()
  @Min(0)
  peso_kg: number;

  @IsInt()
  @Min(0)
  repeticiones_realizadas: number;

  @IsBoolean()
  completada: boolean;
}
