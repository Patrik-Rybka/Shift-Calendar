import { sql, type DbShiftPreset } from './neonClient';

export interface DefaultPresetDefinition {
  title: string;
  start_time: string | null;
  end_time: string | null;
  color: string;
  short_code: string;
  hours: number;
}

/**
 * Standard default presets for shift workers and flexible schedules.
 * Clear names, distinct contrast colors, and typical shift hours.
 */
export const DEFAULT_PRESETS: DefaultPresetDefinition[] = [
  {
    title: 'Denní',
    start_time: '06:00',
    end_time: '18:00',
    color: '#2563EB', // Blue
    short_code: 'D',
    hours: 12.0,
  },
  {
    title: 'Noční',
    start_time: '18:00',
    end_time: '06:00',
    color: '#7C3AED', // Purple
    short_code: 'N',
    hours: 12.0,
  },
  {
    title: 'Ranní',
    start_time: '06:00',
    end_time: '14:00',
    color: '#0284C7', // Sky Blue
    short_code: 'R',
    hours: 8.0,
  },
  {
    title: 'Odpolední',
    start_time: '14:00',
    end_time: '22:00',
    color: '#D97706', // Amber
    short_code: 'O',
    hours: 8.0,
  },
  {
    title: 'Flexi 4h',
    start_time: '14:00',
    end_time: '18:00',
    color: '#0D9488', // Teal
    short_code: '4h',
    hours: 4.0,
  },
  {
    title: 'Volno',
    start_time: null,
    end_time: null,
    color: '#059669', // Emerald Green
    short_code: 'V',
    hours: 0.0,
  },
];

/**
 * Automatically populates a newly created family group with default shift presets.
 */
export async function seedDefaultPresets(groupId: string): Promise<DbShiftPreset[]> {
  const createdPresets: DbShiftPreset[] = [];

  for (const preset of DEFAULT_PRESETS) {
    const result = await sql`
      INSERT INTO shift_presets (
        group_id,
        user_id,
        title,
        start_time,
        end_time,
        color,
        short_code,
        hours
      )
      VALUES (
        ${groupId},
        NULL,
        ${preset.title},
        ${preset.start_time},
        ${preset.end_time},
        ${preset.color},
        ${preset.short_code},
        ${preset.hours}
      )
      RETURNING *;
    `;

    if (result && result.length > 0) {
      createdPresets.push(result[0] as DbShiftPreset);
    }
  }

  return createdPresets;
}

/**
 * Fetches all shift presets available to a family group (group-wide + personal).
 */
export async function getGroupPresets(groupId: string): Promise<DbShiftPreset[]> {
  const result = await sql`
    SELECT *
    FROM shift_presets
    WHERE group_id = ${groupId}
    ORDER BY created_at ASC;
  `;
  return (result || []) as DbShiftPreset[];
}

/**
 * Creates a custom shift preset (e.g. 'Noční Jirka', 'Zástup', etc.)
 */
export async function createCustomPreset(params: {
  groupId: string;
  userId?: string | null;
  title: string;
  startTime?: string | null;
  endTime?: string | null;
  color: string;
  shortCode?: string | null;
  hours?: number;
}): Promise<DbShiftPreset> {
  const result = await sql`
    INSERT INTO shift_presets (
      group_id,
      user_id,
      title,
      start_time,
      end_time,
      color,
      short_code,
      hours
    )
    VALUES (
      ${params.groupId},
      ${params.userId || null},
      ${params.title},
      ${params.startTime || null},
      ${params.endTime || null},
      ${params.color},
      ${params.shortCode || null},
      ${params.hours ?? 8.0}
    )
    RETURNING *;
  `;
  return result[0] as DbShiftPreset;
}

/**
 * Deletes a shift preset.
 */
export async function deletePreset(presetId: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM shift_presets
    WHERE id = ${presetId}
    RETURNING id;
  `;
  return result && result.length > 0;
}

/**
 * Updates an existing shift preset (title, times, hours, color, shortCode).
 */
export async function updatePreset(params: {
  presetId: string;
  userId?: string | null;
  title: string;
  startTime?: string | null;
  endTime?: string | null;
  color: string;
  shortCode?: string | null;
  hours?: number;
}): Promise<DbShiftPreset> {
  const result = await sql`
    UPDATE shift_presets
    SET title = ${params.title},
        user_id = ${params.userId !== undefined ? params.userId : null},
        start_time = ${params.startTime || null},
        end_time = ${params.endTime || null},
        color = ${params.color},
        short_code = ${params.shortCode || null},
        hours = ${params.hours ?? 8.0}
    WHERE id = ${params.presetId}
    RETURNING *;
  `;
  return result[0] as DbShiftPreset;
}

