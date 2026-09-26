import { sql, type DbShift } from './neonClient';

export interface ShiftDeleteTarget {
  groupId: string;
  userId: string;
  date: string;
}

/**
 * Executes batch upsert of shifts into Neon PostgreSQL.
 * Uses ON CONFLICT (group_id, user_id, date) DO UPDATE to guarantee idempotency.
 */
export async function batchUpsertShifts(shiftsToUpsert: DbShift[]): Promise<boolean> {
  if (shiftsToUpsert.length === 0) return true;

  try {
    const upsertPromises = shiftsToUpsert.map((shift) => {
      const dateStr = typeof shift.date === 'string' ? shift.date.split('T')[0] : shift.date;

      return sql`
        INSERT INTO shifts (
          group_id,
          user_id,
          date,
          shift_preset_id,
          custom_hours,
          note,
          updated_at
        )
        VALUES (
          ${shift.group_id},
          ${shift.user_id},
          ${dateStr},
          ${shift.shift_preset_id || null},
          ${shift.custom_hours ?? null},
          ${shift.note || null},
          NOW()
        )
        ON CONFLICT (group_id, user_id, date)
        DO UPDATE SET
          shift_preset_id = EXCLUDED.shift_preset_id,
          custom_hours = EXCLUDED.custom_hours,
          note = EXCLUDED.note,
          updated_at = NOW();
      `;
    });

    await Promise.all(upsertPromises);
    return true;
  } catch (error) {
    console.error('Failed to batch upsert shifts:', error);
    return false;
  }
}

/**
 * Executes batch deletion of shifts from Neon PostgreSQL.
 */
export async function batchDeleteShifts(targets: ShiftDeleteTarget[]): Promise<boolean> {
  if (targets.length === 0) return true;

  try {
    const deletePromises = targets.map((target) =>
      sql`
        DELETE FROM shifts
        WHERE group_id = ${target.groupId}
          AND user_id = ${target.userId}
          AND date = ${target.date};
      `
    );
    await Promise.all(deletePromises);
    return true;
  } catch (error) {
    console.error('Failed to batch delete shifts:', error);
    return false;
  }
}

/**
 * Fetches all shifts for a group in a given date range (usually 1 month + surrounding days).
 */
export async function fetchGroupShiftsRange(
  groupId: string,
  startDate: string,
  endDate: string
): Promise<DbShift[]> {
  try {
    const result = await sql`
      SELECT 
        id,
        group_id,
        user_id,
        TO_CHAR(date, 'YYYY-MM-DD') as date,
        shift_preset_id,
        custom_hours,
        note,
        updated_at
      FROM shifts
      WHERE group_id = ${groupId}
        AND date >= ${startDate}::DATE
        AND date <= ${endDate}::DATE
      ORDER BY date ASC;
    `;
    return (result || []) as DbShift[];
  } catch (error) {
    console.error('Failed to fetch shifts range:', error);
    return [];
  }
}
