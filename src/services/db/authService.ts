import { sql, type DbUser, type DbGroup } from './neonClient';
import { hashPassword } from '@/utils/crypto';

export interface AuthResult {
  user: DbUser;
  group: DbGroup | null;
  members: DbUser[];
}

/**
 * Registers a new user with email/phone and password.
 */
export async function registerUser(params: {
  emailOrPhone: string;
  password: string;
  displayName: string;
  color?: string;
}): Promise<DbUser> {
  const passwordHash = await hashPassword(params.password);
  const cleanEmailOrPhone = params.emailOrPhone.trim().toLowerCase();
  const defaultColor = params.color || '#0EA5E9';

  const result = await sql`
    INSERT INTO users (
      email_or_phone,
      display_name,
      color,
      password_hash
    )
    VALUES (
      ${cleanEmailOrPhone},
      ${params.displayName.trim()},
      ${defaultColor},
      ${passwordHash}
    )
    RETURNING *;
  `;

  return result[0] as DbUser;
}

/**
 * Logs in a user by email/phone and password.
 * Also retrieves their associated group and members if already enrolled in one.
 */
export async function loginUser(
  emailOrPhone: string,
  password: string
): Promise<AuthResult | null> {
  const cleanEmailOrPhone = emailOrPhone.trim().toLowerCase();
  const passwordHash = await hashPassword(password);

  const users = await sql`
    SELECT *
    FROM users
    WHERE email_or_phone = ${cleanEmailOrPhone}
      AND password_hash = ${passwordHash}
    LIMIT 1;
  `;

  if (!users || users.length === 0) {
    return null;
  }

  const user = users[0] as DbUser;
  let group: DbGroup | null = null;
  let members: DbUser[] = [];

  if (user.group_id) {
    const groups = await sql`
      SELECT *
      FROM groups
      WHERE id = ${user.group_id}
      LIMIT 1;
    `;
    if (groups && groups.length > 0) {
      group = groups[0] as DbGroup;

      const groupUsers = await sql`
        SELECT *
        FROM users
        WHERE group_id = ${user.group_id}
        ORDER BY created_at ASC;
      `;
      members = (groupUsers || []) as DbUser[];
    }
  }

  return {
    user,
    group,
    members,
  };
}

/**
 * Updates a user's display name and accent color in Neon database.
 */
export async function updateUserProfile(params: {
  userId: string;
  displayName: string;
  color: string;
}): Promise<DbUser> {
  const result = await sql`
    UPDATE users
    SET display_name = ${params.displayName.trim()},
        color = ${params.color}
    WHERE id = ${params.userId}
    RETURNING *;
  `;
  return result[0] as DbUser;
}

