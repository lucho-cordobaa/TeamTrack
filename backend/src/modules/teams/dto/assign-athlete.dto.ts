import { IsInt, IsNotEmpty } from 'class-validator';

export class AssignAthleteDto {
  @IsInt({ message: 'El ID del atleta debe ser un número entero' })
  @IsNotEmpty({ message: 'El ID del atleta es obligatorio' })
  atleta_id: number;
}
