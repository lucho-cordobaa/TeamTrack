import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Rol } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(Rol.ENTRENADOR)
  @Get('athletes')
  findAllAthletes() {
    return this.usersService.findAllAthletes();
  }

  @Roles(Rol.ENTRENADOR)
  @Get('athletes/unassigned')
  findUnassignedAthletes() {
    return this.usersService.findUnassignedAthletes();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }
}
