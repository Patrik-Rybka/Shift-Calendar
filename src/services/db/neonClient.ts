import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

const DEFAULT_DB_URL =
  'postgresql://neondb_owner:npg_fuYT61GtsckZ@ep-round-block-b169al35-pooler.c-5.eu-central-1.aws.neon.tech/neondb?sslmode=require';

const dbUrl = (process.env.EXPO_PUBLIC_NEON_DATABASE_URL || DEFAULT_DB_URL).trim();

// Initialize Neon HTTP query function (serverless, no persistent TCP connection required)
export const sql: NeonQueryFunction<false, false> = neon(dbUrl);

// ─── Member Permissions ───────────────────────────────────────────────────────

/**
 * Granular permission flags stored as JSONB on each user row.
 * Admins bypass all checks and always have full access.
 */
export interface MemberPermissions {
  /** Can open and view the calendar */
  canViewCalendar: boolean;
  /** Can write and delete their own shifts */
  canEditOwnShifts: boolean;
  /** Can write and delete shifts for any family member */
  canEditAllShifts: boolean;
  /** Can add and delete day notes */
  canAddNotes: boolean;
  /** Can create, edit and delete shift presets */
  canManagePresets: boolean;
}

/** Default permissions granted to a newly joined / approved member. */
export const DEFAULT_MEMBER_PERMISSIONS: MemberPermissions = {
  canViewCalendar: true,
  canEditOwnShifts: true,
  canEditAllShifts: false,
  canAddNotes: true,
  canManagePresets: false,
};

/** Full permissions granted to admins (and optionally elevated members). */
export const FULL_PERMISSIONS: MemberPermissions = {
  canViewCalendar: true,
  canEditOwnShifts: true,
  canEditAllShifts: true,
  canAddNotes: true,
  canManagePresets: true,
};

/**
 * Returns the effective permissions for a user.
 * Admins always get FULL_PERMISSIONS regardless of stored value.
 */
export function getEffectivePermissions(user: DbUser): MemberPermissions {
  if (user.role === 'admin') return FULL_PERMISSIONS;
  return user.permissions ?? DEFAULT_MEMBER_PERMISSIONS;
}

// ─── Database Interfaces ──────────────────────────────────────────────────────

export interface DbGroup {
  id: string;
  name: string;
  join_code: string;
  password_hash?: string | null;
  require_approval: boolean;
  created_at: string;
}

export interface DbUser {
  id: string;
  group_id: string | null;
  email_or_phone: string;
  display_name: string;
  color: string;
  role: 'admin' | 'member';
  status: 'active' | 'pending' | 'rejected';
  password_hash: string;
  /** Granular permission flags (JSONB). Null = use DEFAULT_MEMBER_PERMISSIONS. Admins bypass. */
  permissions: MemberPermissions | null;
  created_at: string;
}

export interface DbShiftPreset {
  id: string;
  group_id: string;
  user_id: string | null;
  title: string;
  start_time: string | null;
  end_time: string | null;
  color: string;
  short_code: string | null;
  hours: number;
  created_at: string;
}

export interface DbShift {
  id: string;
  group_id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  shift_preset_id: string | null;
  custom_hours: number | null;
  note: string | null;
  updated_at: string;
}

/**
 * Health check to verify Neon connectivity
 */
export async function checkNeonConnection(): Promise<boolean> {
  try {
    const result = await sql`SELECT 1 as connected;`;
    return result && result.length > 0;
  } catch (error) {
    console.error('Neon connection error:', error);
    return false;
  }
}
