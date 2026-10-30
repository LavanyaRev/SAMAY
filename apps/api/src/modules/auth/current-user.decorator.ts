import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { UserRole } from "@samay/shared";

export interface AuthenticatedUser {
  id: string;
  keycloakId: string;
  email: string;
  fullName: string;
  role: UserRole;
  regionId?: string;
  regionCode?: string;
  institutionId?: string;
  roles: string[];
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;
    if (!user) return null;
    return data ? user[data] : user;
  },
);
