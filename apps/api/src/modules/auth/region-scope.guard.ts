import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { REGION_SCOPE_KEY, RegionScopeOptions } from "./region-scope.decorator";
import { AuthenticatedUser } from "./current-user.decorator";
import { UserRole } from "@samay/shared";

@Injectable()
export class RegionScopeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RegionScopeOptions>(
      REGION_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      throw new ForbiddenException("Forbidden");
    }

    const crossRegionRoles = options.allowCrossRegionRoles || [
      UserRole.ADMIN,
      UserRole.BUREAU_OFFICER,
      UserRole.COMMITTEE_MEMBER,
      "ADMIN",
      "BUREAU_OFFICER",
      "COMMITTEE_MEMBER",
    ];

    const hasCentralAccess = crossRegionRoles.some(
      (role) => user.role === role || user.roles.includes(role),
    );

    if (hasCentralAccess) {
      return true;
    }

    if (
      user.role === UserRole.REGIONAL_OFFICER ||
      user.roles.includes("REGIONAL_OFFICER")
    ) {
      const paramName = options.paramName || "regionId";
      const requestedRegion =
        request.params?.[paramName] ||
        request.query?.[paramName] ||
        request.body?.[paramName] ||
        request.headers?.["x-target-region-id"];

      if (requestedRegion) {
        const userRegion = user.regionId || user.regionCode;
        if (
          userRegion &&
          requestedRegion !== userRegion &&
          requestedRegion !== user.regionCode
        ) {
          throw new ForbiddenException("Forbidden");
        }
      }
    }

    return true;
  }
}
