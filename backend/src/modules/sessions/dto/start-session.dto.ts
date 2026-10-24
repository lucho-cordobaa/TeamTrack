import { IsInt, IsNotEmpty } from 'class-validator';

export class StartSessionDto {
  @IsInt({ message: 'El ID de la rutina es obligatorio' })
  @IsNotEmpty()
  rutina_id: number;
}
