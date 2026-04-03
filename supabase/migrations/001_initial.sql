-- ============================================================
-- Shogi12 Online — Supabase Schema
-- ============================================================

-- updated_at trigger
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLE: profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname    TEXT        NOT NULL,
  locale      TEXT        NOT NULL DEFAULT 'ko',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- TABLE: rooms
-- ============================================================
CREATE TABLE IF NOT EXISTS rooms (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  status                 TEXT        NOT NULL DEFAULT 'waiting'
                                     CHECK (status IN ('waiting', 'playing', 'finished')),
  host_id                UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  guest_id               UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  current_turn_player_id UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  winner_id              UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rooms_select_authenticated"
  ON rooms FOR SELECT TO authenticated USING (true);

CREATE POLICY "rooms_insert_authenticated"
  ON rooms FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "rooms_update_participants"
  ON rooms FOR UPDATE TO authenticated
  USING (auth.uid() = host_id OR auth.uid() = guest_id)
  WITH CHECK (auth.uid() = host_id OR auth.uid() = guest_id);

-- ============================================================
-- TABLE: games
-- ============================================================
CREATE TABLE IF NOT EXISTS games (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id          UUID        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  board_state      JSONB       NOT NULL,
  captured_top     JSONB       NOT NULL DEFAULT '[]',
  captured_bottom  JSONB       NOT NULL DEFAULT '[]',
  current_turn     TEXT        NOT NULL DEFAULT 'top',
  turn_started_at  TIMESTAMPTZ,
  winner           TEXT,
  game_status      TEXT        NOT NULL DEFAULT 'waiting',
  move_count       INTEGER     NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_game_participant(game_row games)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM rooms r
    WHERE r.id = game_row.room_id
      AND (r.host_id = auth.uid() OR r.guest_id = auth.uid())
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "games_select_participants"
  ON games FOR SELECT TO authenticated
  USING (is_game_participant(games.*));

CREATE POLICY "games_insert_host"
  ON games FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM rooms r WHERE r.id = room_id AND r.host_id = auth.uid()
  ));

CREATE POLICY "games_update_participants"
  ON games FOR UPDATE TO authenticated
  USING (is_game_participant(games.*))
  WITH CHECK (is_game_participant(games.*));

-- ============================================================
-- TABLE: moves
-- ============================================================
CREATE TABLE IF NOT EXISTS moves (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id        UUID        NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  move_number    INTEGER     NOT NULL,
  move_type      TEXT        NOT NULL CHECK (move_type IN ('move', 'drop')),
  from_row       INTEGER,
  from_col       INTEGER,
  to_row         INTEGER     NOT NULL,
  to_col         INTEGER     NOT NULL,
  piece_type     TEXT        NOT NULL,
  promoted       BOOLEAN     NOT NULL DEFAULT false,
  captured_piece TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE moves ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_move_participant(move_row moves)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM games g
    JOIN rooms r ON r.id = g.room_id
    WHERE g.id = move_row.game_id
      AND (r.host_id = auth.uid() OR r.guest_id = auth.uid())
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "moves_select_participants"
  ON moves FOR SELECT TO authenticated
  USING (is_move_participant(moves.*));

CREATE POLICY "moves_insert_acting_player"
  ON moves FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = player_id AND
    EXISTS (
      SELECT 1 FROM games g
      JOIN rooms r ON r.id = g.room_id
      WHERE g.id = game_id
        AND (r.host_id = auth.uid() OR r.guest_id = auth.uid())
    )
  );

-- ============================================================
-- VIEW: match_history
-- ============================================================
CREATE OR REPLACE VIEW match_history AS
SELECT
  g.id                    AS game_id,
  g.room_id,
  g.game_status,
  g.winner,
  g.move_count,
  g.created_at            AS game_started_at,
  g.updated_at            AS game_updated_at,
  r.status                AS room_status,
  r.host_id,
  hp.nickname             AS host_nickname,
  r.guest_id,
  gp.nickname             AS guest_nickname,
  r.winner_id,
  wp.nickname             AS winner_nickname,
  r.created_at            AS room_created_at
FROM games g
JOIN rooms r ON r.id = g.room_id
LEFT JOIN profiles hp ON hp.id = r.host_id
LEFT JOIN profiles gp ON gp.id = r.guest_id
LEFT JOIN profiles wp ON wp.id = r.winner_id;

-- ============================================================
-- Realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE games;
