import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: { sub: number; email: string; rol: string }) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      include: {
        equipo: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado o token invÃ¡lido');
    }

    const { password_hash, ...safeUser } = user;
    return safeUser;
  }
}
