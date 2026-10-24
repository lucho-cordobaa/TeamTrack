import { IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateExerciseDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(150)
  nombre: string;

  @IsString({ message: 'El grupo muscular debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El grupo muscular es obligatorio' })
  @MaxLength(100)
  grupo_muscular: string;

  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  descripcion: string;

  @IsString({ message: 'La URL de imagen debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La imagen de referencia es obligatoria' })
  imagen_url: string;

  @IsOptional()
  @IsString()
  fuente_externa_id?: string;
}
