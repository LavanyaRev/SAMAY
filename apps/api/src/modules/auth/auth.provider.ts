import { Injectable, UnauthorizedException } from "@nestjs/common";
import * as jwt from "jsonwebtoken";
import { verifyPassword } from "@samay/database";
import { PrismaService } from "../../common/prisma/prisma.service";
import { SEEDED_USERS } from "../../common/prisma/seeded-fallback";
import { SystemClockService } from "../../common/clock/clock.service";
import { AUTH_PROVIDER, JWT_SECRET } from "./auth.constants";

export { AUTH_PROVIDER };

export interface AuthTokenPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

export interface ValidatedUserRecord {
  id: string;
  keycloakId: string;
  email: string;
  fullName: string;
  role: string;
  regionId: string | null;
  regionCode: string | null;
  institutionId: string | null;
}

export interface AuthProvider {
  validateCredentials(
    email: string,
    password: string,
  ): Promise<ValidatedUserRecord>;
  issueToken(user: { id: string; email: string }): Promise<string>;
}

@Injectable()
export class LocalAuthProvider implements AuthProvider {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: SystemClockService,
  ) {}

  async validateCredentials(
    email: string,
    password: string,
  ): Promise<ValidatedUserRecord> {
    const normalizedEmail = email.trim().toLowerCase();

    if (this.prisma.isConnected) {
      const user = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: { region: true },
      });

      if (!user || !user.isActive || user.deletedAt) {
        throw new UnauthorizedException("Invalid email or password");
      }

      if (!verifyPassword(password, user.passwordHash)) {
        throw new UnauthorizedException("Invalid email or password");
      }

      return {
        id: user.id,
        keycloakId: user.keycloakId,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        regionId: user.regionId,
        regionCode: user.region?.code ?? null,
        institutionId: user.institutionId,
      };
    }

    const fallbackUser = SEEDED_USERS.find(
      (u) => u.email.toLowerCase() === normalizedEmail,
    );
    if (!fallbackUser || !fallbackUser.isActive || fallbackUser.deletedAt) {
      throw new UnauthorizedException("Invalid email or password");
    }

    if (!verifyPassword(password, fallbackUser.passwordHash)) {
      throw new UnauthorizedException("Invalid email or password");
    }

    return {
      id: fallbackUser.id,
      keycloakId: fallbackUser.keycloakId,
      email: fallbackUser.email,
      fullName: fallbackUser.fullName,
      role: fallbackUser.role,
      regionId: fallbackUser.regionId,
      regionCode: fallbackUser.regionCode,
      institutionId: fallbackUser.institutionId,
    };
  }

  async issueToken(user: { id: string; email: string }): Promise<string> {
    const iat = Math.floor(this.clock.now().getTime() / 1000);
    const exp = iat + 8 * 60 * 60;
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        iat,
        exp,
      },
      JWT_SECRET,
      { algorithm: "HS256" },
    );
  }
}
