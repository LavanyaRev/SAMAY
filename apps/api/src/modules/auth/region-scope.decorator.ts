import { SetMetadata } from "@nestjs/common";

export const REGION_SCOPE_KEY = "region_scope";

export interface RegionScopeOptions {
  paramName?: string; // defaults to 'regionId'
  allowCrossRegionRoles?: string[]; // defaults to ['ADMIN', 'BUREAU_OFFICER', 'COMMITTEE_MEMBER']
}

export const RequireRegionScope = (options: RegionScopeOptions = {}) =>
  SetMetadata(REGION_SCOPE_KEY, options);

export const RegionScope = RequireRegionScope;
