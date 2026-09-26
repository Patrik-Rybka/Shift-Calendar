-- ==============================================================================
-- RODINNÝ KALENDÁŘ SMĚN (FAMILY SHIFT CALENDAR) - NEON POSTGRESQL SCHEMA
-- ==============================================================================

-- 1. Aktivace rozšíření pro generování UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABULKA SKUPIN (Rodinné kalendáře propojené 6místným kódem)
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    join_code VARCHAR(10) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABULKA UŽIVATELŮ (Členové rodiny s vlastním jménem a barvou)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    email_or_phone TEXT NOT NULL,
    display_name TEXT NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT '#0EA5E9',
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_in_group UNIQUE (group_id, email_or_phone)
);

-- 4. TABULKA TYPŮ SMĚN (Předvolby např. 'Noční Jirka', 'Denní Hanka', '14-18', flexi)
CREATE TABLE IF NOT EXISTS shift_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL = k dispozici všem v rodině
    title TEXT NOT NULL,
    start_time VARCHAR(10),
    end_time VARCHAR(10),
    color VARCHAR(20) NOT NULL DEFAULT '#2563EB',
    short_code VARCHAR(10),
    hours NUMERIC(4, 1) DEFAULT 8.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TABULKA ZAPSANÝCH SMĚN (Samotné záznamy v kalendáři)
CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    shift_preset_id UUID REFERENCES shift_presets(id) ON DELETE SET NULL,
    custom_hours NUMERIC(4, 1),
    note TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Zajišťuje, že jeden uživatel má v daný den maximálně jeden primární záznam směny
    CONSTRAINT uq_user_shift_per_date UNIQUE (group_id, user_id, date)
);

-- ==============================================================================
-- INDEXY PRO BLESKOVÉ VYHLEDÁVÁNÍ A SYNCHRONIZACI
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_groups_join_code ON groups(join_code);
CREATE INDEX IF NOT EXISTS idx_users_group_id ON users(group_id);
CREATE INDEX IF NOT EXISTS idx_shift_presets_group_id ON shift_presets(group_id);
CREATE INDEX IF NOT EXISTS idx_shifts_group_date ON shifts(group_id, date);
CREATE INDEX IF NOT EXISTS idx_shifts_user_date ON shifts(user_id, date);
