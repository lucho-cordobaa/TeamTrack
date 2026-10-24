import { IsBoolean, IsDateString, IsInt, IsNotEmpty, IsOptional } from 'class-validator';

export class RecordAttendanceDto {
  @IsInt({ message: 'El ID del usuario es obligatorio' })
  @IsNotEmpty()
  usuario_id: number;

  @IsDateString({}, { message: 'La fecha debe ser un string de fecha válido (YYYY-MM-DD)' })
  @IsNotEmpty()
  fecha: string;

  @IsOptional()
  @IsBoolean()
  presente?: boolean;
}
