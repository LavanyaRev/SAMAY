import { Inject, Injectable } from "@nestjs/common";
import { getPermissionsForRole } from "@samay/shared";
import { SystemClockService } from "../../common/clock/clock.service";
import { AUTH_PROVIDER, AuthProvider } from "./auth.provider";
import { AuthenticatedUser } from "./current-user.decorator";
import { mapDbRoleToStatutoryRole } from "./jwt.strategy";

@Injectable()
export class AuthService {
  constructor(
    private readonly clock: SystemClockService,
    @Inject(AUTH_PROVIDER) private readonly authProvider: AuthProvider,
  ) {}

  getStatus() {
    return {
      status: "authenticated_provider_ready",
      provider: "AuthProvider",
      timestamp: this.clock.isoString(),
    };
  }

  async login(email: string, password: string) {
    const record = await this.authProvider.validateCredentials(email, password);
    const accessToken = await this.authProvider.issueToken({
      id: record.id,
      email: record.email,
    });
    const statutoryRole = mapDbRoleToStatutoryRole(record.role);
    const user: AuthenticatedUser = {
      id: record.id,
      keycloakId: record.keycloakId,
      email: record.email,
      fullName: record.fullName,
      role: statutoryRole,
      regionId: record.regionId ?? undefined,
      regionCode: record.regionCode ?? undefined,
      institutionId: record.institutionId ?? undefined,
      roles: [record.role, statutoryRole],
    };

    return {
      accessToken,
      access_token: accessToken,
      tokenType: "Bearer",
      ...this.getProfile(user),
    };
  }

  getProfile(user: AuthenticatedUser) {
    const permissions = getPermissionsForRole(user.role);
    return {
      user: {
        id: user.id,
        keycloakId: user.keycloakId,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        regionId: user.regionId,
        regionCode: user.regionCode,
        institutionId: user.institutionId,
        roles: user.roles,
      },
      permissions,
      issuedAt: this.clock.isoString(),
    };
  }
}
