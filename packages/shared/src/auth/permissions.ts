import { UserRole } from '../types/index.js';

export enum Resource {
  APPLICATION = 'APPLICATION',
  INSTITUTION = 'INSTITUTION',
  EVC_CASE = 'EVC_CASE',
  UNDERTAKING = 'UNDERTAKING',
  DOCUMENT = 'DOCUMENT',
  DUE_ITEM = 'DUE_ITEM',
  AUDIT_LOG = 'AUDIT_LOG',
  SYSTEM_SETTING = 'SYSTEM_SETTING',
  HOLIDAY_CALENDAR = 'HOLIDAY_CALENDAR',
}

export enum Action {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  SUBMIT = 'SUBMIT',
  VERIFY = 'VERIFY',
  SCHEDULE = 'SCHEDULE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  MANAGE = 'MANAGE',
}

export interface PermissionDefinition {
  resource: Resource;
  action: Action;
}

/**
 * Statutory Permission Matrix: Resource x Action x Role
 * Defines statutory role authorizations across all compliance entities.
 */
export const PERMISSION_MATRIX: Record<UserRole, Record<Resource, Action[]>> = {
  [UserRole.ADMIN]: {
    [Resource.APPLICATION]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.SUBMIT, Action.VERIFY, Action.SCHEDULE, Action.APPROVE, Action.REJECT, Action.MANAGE],
    [Resource.INSTITUTION]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.MANAGE],
    [Resource.EVC_CASE]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.SCHEDULE, Action.APPROVE, Action.MANAGE],
    [Resource.UNDERTAKING]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.VERIFY, Action.MANAGE],
    [Resource.DOCUMENT]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.VERIFY, Action.MANAGE],
    [Resource.DUE_ITEM]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.MANAGE],
    [Resource.AUDIT_LOG]: [Action.READ],
    [Resource.SYSTEM_SETTING]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.MANAGE],
    [Resource.HOLIDAY_CALENDAR]: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE, Action.MANAGE],
  },
  [UserRole.BUREAU_OFFICER]: {
    [Resource.APPLICATION]: [Action.READ, Action.UPDATE, Action.VERIFY, Action.SCHEDULE, Action.APPROVE, Action.REJECT],
    [Resource.INSTITUTION]: [Action.READ, Action.UPDATE],
    [Resource.EVC_CASE]: [Action.READ, Action.SCHEDULE, Action.UPDATE, Action.APPROVE],
    [Resource.UNDERTAKING]: [Action.READ, Action.VERIFY],
    [Resource.DOCUMENT]: [Action.READ, Action.VERIFY],
    [Resource.DUE_ITEM]: [Action.READ, Action.UPDATE],
    [Resource.AUDIT_LOG]: [Action.READ],
    [Resource.SYSTEM_SETTING]: [Action.READ],
    [Resource.HOLIDAY_CALENDAR]: [Action.READ, Action.UPDATE],
  },
  [UserRole.REGIONAL_OFFICER]: {
    [Resource.APPLICATION]: [Action.READ, Action.UPDATE, Action.VERIFY, Action.SCHEDULE],
    [Resource.INSTITUTION]: [Action.READ, Action.UPDATE],
    [Resource.EVC_CASE]: [Action.READ, Action.SCHEDULE],
    [Resource.UNDERTAKING]: [Action.READ, Action.VERIFY],
    [Resource.DOCUMENT]: [Action.READ, Action.VERIFY],
    [Resource.DUE_ITEM]: [Action.READ],
    [Resource.AUDIT_LOG]: [Action.READ],
    [Resource.SYSTEM_SETTING]: [Action.READ],
    [Resource.HOLIDAY_CALENDAR]: [Action.READ],
  },
  [UserRole.COMMITTEE_MEMBER]: {
    [Resource.APPLICATION]: [Action.READ],
    [Resource.INSTITUTION]: [Action.READ],
    [Resource.EVC_CASE]: [Action.READ, Action.UPDATE, Action.SUBMIT],
    [Resource.UNDERTAKING]: [Action.READ],
    [Resource.DOCUMENT]: [Action.READ],
    [Resource.DUE_ITEM]: [Action.READ],
    [Resource.AUDIT_LOG]: [],
    [Resource.SYSTEM_SETTING]: [],
    [Resource.HOLIDAY_CALENDAR]: [Action.READ],
  },
  [UserRole.INSTITUTION]: {
    [Resource.APPLICATION]: [Action.CREATE, Action.READ, Action.UPDATE, Action.SUBMIT],
    [Resource.INSTITUTION]: [Action.READ, Action.UPDATE],
    [Resource.EVC_CASE]: [Action.READ],
    [Resource.UNDERTAKING]: [Action.READ, Action.SUBMIT],
    [Resource.DOCUMENT]: [Action.CREATE, Action.READ, Action.UPDATE, Action.SUBMIT],
    [Resource.DUE_ITEM]: [Action.READ],
    [Resource.AUDIT_LOG]: [],
    [Resource.SYSTEM_SETTING]: [],
    [Resource.HOLIDAY_CALENDAR]: [Action.READ],
  },
};

/**
 * Check whether a role possesses permission for a given resource and action
 */
export function hasPermission(role: UserRole | string, resource: Resource, action: Action): boolean {
  const normalizedRole = role as UserRole;
  const rolePermissions = PERMISSION_MATRIX[normalizedRole];
  if (!rolePermissions) return false;
  const resourceActions = rolePermissions[resource];
  if (!resourceActions) return false;
  return resourceActions.includes(action);
}

/**
 * Get all permissions for a specific role
 */
export function getPermissionsForRole(role: UserRole | string): PermissionDefinition[] {
  const normalizedRole = role as UserRole;
  const rolePermissions = PERMISSION_MATRIX[normalizedRole];
  if (!rolePermissions) return [];

  const list: PermissionDefinition[] = [];
  for (const [resource, actions] of Object.entries(rolePermissions)) {
    for (const act of actions) {
      list.push({ resource: resource as Resource, action: act });
    }
  }
  return list;
}

