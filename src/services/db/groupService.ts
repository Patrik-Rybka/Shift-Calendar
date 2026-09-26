import { sql, type DbGroup, type DbUser, type MemberPermissions, DEFAULT_MEMBER_PERMISSIONS, FULL_PERMISSIONS } from './neonClient';
import { seedDefaultPresets } from './shiftService';
import { hashPassword } from '@/utils/crypto';

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

export type JoinGroupResult =
  | {
      success: true;
      group: DbGroup;
      user: DbUser;
      members: DbUser[];
      status: 'active' | 'pending';
    }
  | {
      success: false;
      reason: 'NOT_FOUND' | 'PASSWORD_REQUIRED' | 'INCORRECT_PASSWORD' | 'UNKNOWN';
      groupName?: string;
    };

/**
 * Creates a new family group with a unique 6-character join code,
 * optional group password/PIN, admission approval policy,
 * automatically populates default shift presets, and links the creator as admin.
 */
export async function createFamilyGroup(params: {
  groupName: string;
  userId: string;
  password?: string | null;
  requireApproval?: boolean;
}): Promise<{ group: DbGroup; user: DbUser }> {
  const groupName = params.groupName.trim() || 'Rodinný kalendář';
  let joinCode = generateJoinCode();
  const passwordHash =
    params.password && params.password.trim().length > 0
      ? await hashPassword(params.password.trim())
      : null;
  const requireApproval = Boolean(params.requireApproval);

  // Insert new group
  const groupRows = await sql`
    INSERT INTO groups (name, join_code, password_hash, require_approval)
    VALUES (${groupName}, ${joinCode}, ${passwordHash}, ${requireApproval})
    RETURNING *;
  `;
  const group = groupRows[0] as DbGroup;

  // Link creator to this group as admin with active status + full permissions
  const userRows = await sql`
    UPDATE users
    SET group_id = ${group.id},
        role = 'admin',
        status = 'active',
        permissions = ${JSON.stringify(FULL_PERMISSIONS)}::jsonb
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
 * Validates group password if set, and sets status to 'pending' if approval is required.
 */
export async function joinFamilyGroup(params: {
  joinCode: string;
  userId: string;
  password?: string | null;
}): Promise<JoinGroupResult> {
  const cleanCode = params.joinCode.trim().toUpperCase();

  // Find group by join code
  const groups = await sql`
    SELECT *
    FROM groups
    WHERE UPPER(join_code) = ${cleanCode}
    LIMIT 1;
  `;

  if (!groups || groups.length === 0) {
    return { success: false, reason: 'NOT_FOUND' };
  }

  const group = groups[0] as DbGroup;

  // Check group password if group is password protected
  if (group.password_hash) {
    if (!params.password || params.password.trim().length === 0) {
      return { success: false, reason: 'PASSWORD_REQUIRED', groupName: group.name };
    }
    const inputHash = await hashPassword(params.password.trim());
    if (inputHash !== group.password_hash) {
      return { success: false, reason: 'INCORRECT_PASSWORD', groupName: group.name };
    }
  }

  // Determine user status (pending if approval required, active if open)
  const userStatus: 'active' | 'pending' = group.require_approval ? 'pending' : 'active';

  // Update user's group_id, role and status; set default permissions if auto-approved
  const userRows = await sql`
    UPDATE users
    SET group_id = ${group.id},
        role = 'member',
        status = ${userStatus},
        permissions = ${userStatus === 'active' ? JSON.stringify(DEFAULT_MEMBER_PERMISSIONS) : null}::jsonb
    WHERE id = ${params.userId}
    RETURNING *;
  `;
  const updatedUser = userRows[0] as DbUser;

  // Fetch all active members in the group
  const members = await sql`
    SELECT *
    FROM users
    WHERE group_id = ${group.id} AND status = 'active'
    ORDER BY created_at ASC;
  `;

  return {
    success: true,
    group,
    user: updatedUser,
    members: (members || []) as DbUser[],
    status: userStatus,
  };
}

/**
 * Refreshes current user's membership and approval status from the cloud.
 */
export async function refreshUserStatus(userId: string): Promise<{
  user: DbUser | null;
  group: DbGroup | null;
  members: DbUser[];
}> {
  const users = await sql`
    SELECT *
    FROM users
    WHERE id = ${userId}
    LIMIT 1;
  `;

  if (!users || users.length === 0) {
    return { user: null, group: null, members: [] };
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
      const memberRows = await sql`
        SELECT *
        FROM users
        WHERE group_id = ${user.group_id} AND status = 'active'
        ORDER BY created_at ASC;
      `;
      members = (memberRows || []) as DbUser[];
    }
  }

  return { user, group, members };
}

/**
 * Cancels a pending request or leaves current unconfirmed group.
 */
export async function cancelPendingRequest(userId: string): Promise<DbUser | null> {
  const userRows = await sql`
    UPDATE users
    SET group_id = NULL,
        role = 'member',
        status = 'active'
    WHERE id = ${userId}
    RETURNING *;
  `;
  return userRows && userRows.length > 0 ? (userRows[0] as DbUser) : null;
}

/**
 * Creates a virtual family member (e.g. child, relative without a smartphone)
 * directly linked to the family group. Gets default permissions automatically.
 */
export async function addVirtualFamilyMember(params: {
  groupId: string;
  displayName: string;
  color: string;
}): Promise<DbUser> {
  const cleanName = params.displayName.trim();
  const virtualIdentifier = `virtual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const userRows = await sql`
    INSERT INTO users (
      group_id,
      display_name,
      color,
      role,
      status,
      email_or_phone,
      password_hash,
      permissions
    )
    VALUES (
      ${params.groupId},
      ${cleanName},
      ${params.color},
      'member',
      'active',
      ${virtualIdentifier},
      'virtual_profile',
      ${JSON.stringify(DEFAULT_MEMBER_PERMISSIONS)}::jsonb
    )
    RETURNING *;
  `;

  return userRows[0] as DbUser;
}

// ─── Step 7.3: Admin Member Management ───────────────────────────────────────

/**
 * Fetches all users with 'pending' status waiting for admin approval.
 */
export async function getPendingMembers(groupId: string): Promise<DbUser[]> {
  const result = await sql`
    SELECT *
    FROM users
    WHERE group_id = ${groupId} AND status = 'pending'
    ORDER BY created_at ASC;
  `;
  return (result || []) as DbUser[];
}

/**
 * Admin approves a pending member — sets status to 'active' and assigns default permissions.
 */
export async function approveMember(userId: string): Promise<DbUser | null> {
  const result = await sql`
    UPDATE users
    SET status = 'active',
        permissions = ${JSON.stringify(DEFAULT_MEMBER_PERMISSIONS)}::jsonb
    WHERE id = ${userId}
    RETURNING *;
  `;
  return result && result.length > 0 ? (result[0] as DbUser) : null;
}

/**
 * Admin rejects a pending member — removes them from the group and sets status to 'rejected'.
 */
export async function rejectMember(userId: string): Promise<boolean> {
  const result = await sql`
    UPDATE users
    SET status = 'rejected',
        group_id = NULL
    WHERE id = ${userId}
    RETURNING id;
  `;
  return result && result.length > 0;
}

/**
 * Admin removes an active member from the group (kick).
 * Clears group_id and resets their role/status so they can join another group.
 */
export async function removeMemberFromGroup(userId: string): Promise<boolean> {
  const result = await sql`
    UPDATE users
    SET group_id = NULL,
        role = 'member',
        status = 'active',
        permissions = NULL
    WHERE id = ${userId}
    RETURNING id;
  `;
  return result && result.length > 0;
}

/**
 * Admin promotes a member to admin or demotes admin to member.
 * Promoting sets full permissions; demoting resets to default permissions.
 */
export async function updateMemberRole(userId: string, role: 'admin' | 'member'): Promise<DbUser | null> {
  const permissionsToSet = role === 'admin' ? FULL_PERMISSIONS : DEFAULT_MEMBER_PERMISSIONS;
  const result = await sql`
    UPDATE users
    SET role = ${role},
        permissions = ${JSON.stringify(permissionsToSet)}::jsonb
    WHERE id = ${userId}
    RETURNING *;
  `;
  return result && result.length > 0 ? (result[0] as DbUser) : null;
}

/**
 * Admin updates granular permission flags for a specific member.
 */
export async function updateMemberPermissions(
  userId: string,
  permissions: MemberPermissions
): Promise<DbUser | null> {
  const result = await sql`
    UPDATE users
    SET permissions = ${JSON.stringify(permissions)}::jsonb
    WHERE id = ${userId}
    RETURNING *;
  `;
  return result && result.length > 0 ? (result[0] as DbUser) : null;
}

// ─── Step 7.3: Group Security ─────────────────────────────────────────────────

/**
 * Admin changes or clears the group join password.
 * Pass null or empty string to remove the password entirely.
 */
export async function updateGroupPassword(
  groupId: string,
  newPassword: string | null
): Promise<DbGroup | null> {
  const passwordHash =
    newPassword && newPassword.trim().length > 0
      ? await hashPassword(newPassword.trim())
      : null;

  const result = await sql`
    UPDATE groups
    SET password_hash = ${passwordHash}
    WHERE id = ${groupId}
    RETURNING *;
  `;
  return result && result.length > 0 ? (result[0] as DbGroup) : null;
}

/**
 * Admin toggles the manual-approval policy for joining members.
 */
export async function updateGroupApprovalPolicy(
  groupId: string,
  requireApproval: boolean
): Promise<DbGroup | null> {
  const result = await sql`
    UPDATE groups
    SET require_approval = ${requireApproval}
    WHERE id = ${groupId}
    RETURNING *;
  `;
  return result && result.length > 0 ? (result[0] as DbGroup) : null;
}
