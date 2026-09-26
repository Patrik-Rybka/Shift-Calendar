import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

// Retrieve database URL from Expo environment variable
const dbUrl = process.env.EXPO_PUBLIC_NEON_DATABASE_URL || 'postgresql://neondb_owner:npg_fuYT61GtsckZ@ep-round-block-b169al35-pooler.c-5.eu-central-1.aws.neon.tech/neondb?sslmode=require';

// Initialize Neon HTTP query function (serverless, no persistent TCP connection required)
export const sql: NeonQueryFunction<false, false> = neon(dbUrl);

// Database Interfaces
export interface DbGroup {
  id: string;
  name: string;
  join_code: string;
  created_at: string;
}

export interface DbUser {
  id: string;
  group_id: string | null;
  email_or_phone: string;
  display_name: string;
  color: string;
  role: 'admin' | 'member';
  password_hash: string;
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
