import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import { Rol } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.usuario.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Ya existe un usuario registrado con este correo');
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(dto.password, salt);

    // Si es entrenador, no pertenece a un equipo_id (administra equipos)
    const equipo_id = dto.rol === Rol.ENTRENADOR ? null : (dto.equipo_id || null);

    const user = await this.prisma.usuario.create({
      data: {
        nombre: dto.nombre,
        email: dto.email.toLowerCase(),
        password_hash,
        rol: dto.rol,
        equipo_id,
      },
      include: {
        equipo: true,
      },
    });

    const token = this.generateToken(user.id, user.email, user.rol);
    const { password_hash: _, ...safeUser } = user;

    return {
      user: safeUser,
      token,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.usuario.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        equipo: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const token = this.generateToken(user.id, user.email, user.rol);
    const { password_hash: _, ...safeUser } = user;

    return {
      user: safeUser,
      token,
    };
  }

  async getMe(userId: number) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
      include: {
        equipo: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    const { password_hash: _, ...safeUser } = user;
    return safeUser;
  }

  private generateToken(userId: number, email: string, rol: Rol): string {
    const payload = { sub: userId, email, rol };
    return this.jwtService.sign(payload);
  }
}
