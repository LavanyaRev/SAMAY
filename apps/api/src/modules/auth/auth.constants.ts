export const KEYCLOAK_URL = process.env.KEYCLOAK_URL || "http://localhost:8080";
export const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "samay";
export const KEYCLOAK_ISSUER = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`;
export const KEYCLOAK_JWKS_URI = `${KEYCLOAK_ISSUER}/protocol/openid-connect/certs`;

export const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.TEST_JWT_SECRET ||
  "samay-phase1-super-secret-key-for-testcontainers";

export const TEST_JWT_SECRET = JWT_SECRET;
export const AUTH_PROVIDER = "AUTH_PROVIDER";
