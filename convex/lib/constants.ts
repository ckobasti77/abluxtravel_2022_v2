export const OWNER_EMAIL = "abluxtravel@gmail.com";

// Salt of the pre-2026 SHA-256 password hashes. Not a secret: it is only used
// to verify legacy customer hashes once, before they are rehashed with Scrypt.
export const LEGACY_AUTH_SALT = "abluxtravel2022_auth_v1";

export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
