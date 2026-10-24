import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsInt, MinLength } from 'class-validator';
import { Rol } from '@prisma/client';

export class RegisterDto {
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre: string;

  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  email: string;

  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @IsEnum(Rol, { message: 'El rol debe ser ENTRENADOR o ATLETA' })
  rol: Rol;

  @IsOptional()
  @IsInt({ message: 'El equipo debe ser un identificador numérico' })
  equipo_id?: number;
}
