import { sql, type DbGroup, type DbUser } from './neonClient';
import { seedDefaultPresets } from './shiftService';

/**
 * Generates an uppercase 6-character code avoiding ambiguous characters (0, O, 1, I).
 */
export function generateJoinCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }
  return result;
}

/**
 * Creates a new family group with a unique 6-character join code,
 * automatically populates default shift presets, and links the creator to the group.
 */
export async function createFamilyGroup(params: {
  groupName: string;
  userId: string;
}): Promise<{ group: DbGroup; user: DbUser }> {
  const groupName = params.groupName.trim() || 'Rodinný kalendář';
  let joinCode = generateJoinCode();

  // Insert new group
  const groupRows = await sql`
    INSERT INTO groups (name, join_code)
    VALUES (${groupName}, ${joinCode})
    RETURNING *;
  `;
  const group = groupRows[0] as DbGroup;

  // Link user to this group as admin
  const userRows = await sql`
    UPDATE users
    SET group_id = ${group.id},
        role = 'admin'
    WHERE id = ${params.userId}
    RETURNING *;
  `;
  const updatedUser = userRows[0] as DbUser;

  // Seed default presets (Denní, Noční, Flexi 4h, Volno, etc.)
  await seedDefaultPresets(group.id);

  return {
    group,
    user: updatedUser,
  };
}

/**
 * Joins an existing family group by entering the 6-character join code.
 */
export async function joinFamilyGroup(params: {
  joinCode: string;
  userId: string;
}): Promise<{ group: DbGroup; user: DbUser; members: DbUser[] } | null> {
  const cleanCode = params.joinCode.trim().toUpperCase();

  // Find group by join code
  const groups = await sql`
    SELECT *
    FROM groups
    WHERE UPPER(join_code) = ${cleanCode}
    LIMIT 1;
  `;

  if (!groups || groups.length === 0) {
    return null;
  }

  const group = groups[0] as DbGroup;

  // Update user's group_id as member
  const userRows = await sql`
    UPDATE users
    SET group_id = ${group.id},
        role = 'member'
    WHERE id = ${params.userId}
    RETURNING *;
  `;
  const updatedUser = userRows[0] as DbUser;

  // Fetch all members in the group
  const members = await sql`
    SELECT *
    FROM users
    WHERE group_id = ${group.id}
    ORDER BY created_at ASC;
  `;

  return {
    group,
    user: updatedUser,
    members: (members || []) as DbUser[],
  };
}
