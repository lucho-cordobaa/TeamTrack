import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { FirebaseModule } from './firebase/firebase.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TeamsModule } from './modules/teams/teams.module';
import { ExercisesModule } from './modules/exercises/exercises.module';
import { RoutinesModule } from './modules/routines/routines.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { ProgressModule } from './modules/progress/progress.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    PrismaModule,
    FirebaseModule,
    AuthModule,
    UsersModule,
    TeamsModule,
    ExercisesModule,
    RoutinesModule,
    AttendanceModule,
    SessionsModule,
    ProgressModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
