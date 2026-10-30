import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AUTH_PROVIDER } from "./auth.constants";
import { LocalAuthProvider } from "./auth.provider";
import { JwtStrategy } from "./jwt.strategy";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { RolesGuard } from "./roles.guard";
import { RegionScopeGuard } from "./region-scope.guard";

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" })],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalAuthProvider,
    {
      provide: AUTH_PROVIDER,
      useExisting: LocalAuthProvider,
    },
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    RegionScopeGuard,
  ],
  exports: [
    AuthService,
    AUTH_PROVIDER,
    PassportModule,
    JwtAuthGuard,
    RolesGuard,
    RegionScopeGuard,
  ],
})
export class AuthModule {}
