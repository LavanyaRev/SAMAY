import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { UserRole } from "@samay/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { SEEDED_USERS } from "../../common/prisma/seeded-fallback";
import { JWT_SECRET } from "./auth.constants";
import { AuthenticatedUser } from "./current-user.decorator";

export function mapDbRoleToStatutoryRole(dbRole: string): UserRole {
  if (dbRole === "ADMIN" || dbRole === "SUPER_ADMIN") {
    return UserRole.ADMIN;
  }
  if (dbRole === "BUREAU_OFFICER" || dbRole === "BUREAU_HEAD") {
    return UserRole.BUREAU_OFFICER;
  }
  if (dbRole === "REGIONAL_OFFICER") {
    return UserRole.REGIONAL_OFFICER;
  }
  if (
    dbRole === "COMMITTEE_MEMBER" ||
    dbRole === "SCRUTINY_MEMBER" ||
    dbRole === "EVC_EXPERT"
  ) {
    return UserRole.COMMITTEE_MEMBER;
  }
  return UserRole.INSTITUTION;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(private readonly prisma: PrismaService) {
    super({
      secretOrKey: JWT_SECRET,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ["HS256"],
    });
  }

  async validate(payload: {
    sub?: string;
    userId?: string;
    email?: string;
  }): Promise<AuthenticatedUser> {
    const targetId = payload?.sub || payload?.userId;
    if (!targetId) {
      throw new UnauthorizedException("Invalid authentication token");
    }

    if (this.prisma.isConnected) {
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { id: targetId },
            { keycloakId: targetId },
            ...(payload.email ? [{ email: payload.email }] : []),
          ],
          isActive: true,
          deletedAt: null,
        },
        include: {
          region: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException("User record not found or inactive");
      }

      const primaryRole = mapDbRoleToStatutoryRole(user.role);

      return {
        id: user.id,
        keycloakId: user.keycloakId,
        email: user.email,
        fullName: user.fullName,
        role: primaryRole,
        regionId: user.regionId ?? undefined,
        regionCode: user.region?.code ?? undefined,
        institutionId: user.institutionId ?? undefined,
        roles: [user.role, primaryRole],
      };
    }

    const fallbackUser = SEEDED_USERS.find(
      (u) =>
        u.id === targetId ||
        u.keycloakId === targetId ||
        (payload.email &&
          u.email.toLowerCase() === payload.email.toLowerCase()),
    );

    if (!fallbackUser) {
      throw new UnauthorizedException("User record not found or inactive");
    }

    const primaryRole = mapDbRoleToStatutoryRole(fallbackUser.role);
    return {
      id: fallbackUser.id,
      keycloakId: fallbackUser.keycloakId,
      email: fallbackUser.email,
      fullName: fallbackUser.fullName,
      role: primaryRole,
      regionId: fallbackUser.regionId ?? undefined,
      regionCode: fallbackUser.regionCode ?? undefined,
      institutionId: fallbackUser.institutionId ?? undefined,
      roles: [fallbackUser.role, primaryRole],
    };
  }
}
