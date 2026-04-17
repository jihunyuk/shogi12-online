CREATE OR REPLACE FUNCTION handle_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE profiles (
  id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT        NOT NULL DEFAULT '',
  nickname     TEXT        NOT NULL DEFAULT '',
  locale       TEXT        NOT NULL DEFAULT 'ko',
  rating       INTEGER     NOT NULL DEFAULT 1200,
  country_code TEXT        NOT NULL DEFAULT '',
  total_wins   INTEGER     NOT NULL DEFAULT 0,
  total_losses INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX profiles_nickname_unique ON profiles (nickname) WHERE nickname <> '';

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_authenticated" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own"           ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own"           ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE daily_stats (
  player_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  match_count  INT  NOT NULL DEFAULT 0,
  tickets_used INT  NOT NULL DEFAULT 0,
  ad_bonus     INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (player_id, date)
);

ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_stats_select_own" ON daily_stats FOR SELECT TO authenticated USING (auth.uid() = player_id);
CREATE POLICY "daily_stats_insert_own" ON daily_stats FOR INSERT TO authenticated WITH CHECK (auth.uid() = player_id);
CREATE POLICY "daily_stats_update_own" ON daily_stats FOR UPDATE TO authenticated USING (auth.uid() = player_id);

CREATE OR REPLACE FUNCTION kst_today() RETURNS DATE LANGUAGE sql STABLE AS $$
  SELECT (NOW() AT TIME ZONE 'Asia/Seoul')::DATE;
$$;

CREATE OR REPLACE FUNCTION get_daily_tickets(p_player_id UUID) RETURNS TABLE (tickets_used INT, ad_bonus INT) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO daily_stats (player_id, date, match_count, tickets_used, ad_bonus)
  VALUES (p_player_id, kst_today(), 0, 0, 0) ON CONFLICT (player_id, date) DO NOTHING;
  RETURN QUERY SELECT ds.tickets_used, ds.ad_bonus FROM daily_stats ds WHERE ds.player_id = p_player_id AND ds.date = kst_today();
END;
$$;

CREATE OR REPLACE FUNCTION consume_ticket(p_player_id UUID) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_used INT; v_bonus INT; v_max INT;
BEGIN
  INSERT INTO daily_stats (player_id, date, match_count, tickets_used, ad_bonus) VALUES (p_player_id, kst_today(), 0, 0, 0) ON CONFLICT DO NOTHING;
  SELECT ds.tickets_used, ds.ad_bonus INTO v_used, v_bonus FROM daily_stats ds WHERE ds.player_id = p_player_id AND ds.date = kst_today() FOR UPDATE;
  v_max := 5 + v_bonus;
  IF v_used >= v_max THEN RETURN FALSE; END IF;
  UPDATE daily_stats SET tickets_used = tickets_used + 1 WHERE player_id = p_player_id AND date = kst_today();
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION grant_ad_ticket(p_player_id UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO daily_stats (player_id, date, match_count, tickets_used, ad_bonus) VALUES (p_player_id, kst_today(), 0, 0, 1) ON CONFLICT (player_id, date) DO UPDATE SET ad_bonus = daily_stats.ad_bonus + 1;
END;
$$;

CREATE TABLE rooms (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  status                 TEXT        NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  host_id                UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  guest_id               UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  current_turn_player_id UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  winner_id              UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rooms_select_authenticated" ON rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "rooms_insert_authenticated" ON rooms FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "rooms_update_participants"  ON rooms FOR UPDATE TO authenticated USING (auth.uid() = host_id OR auth.uid() = guest_id OR (guest_id IS NULL AND status = 'waiting')) WITH CHECK (auth.uid() = host_id OR auth.uid() = guest_id);

CREATE TABLE games (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         UUID        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  board_state     JSONB       NOT NULL,
  captured_top    JSONB       NOT NULL DEFAULT '[]',
  captured_bottom JSONB       NOT NULL DEFAULT '[]',
  current_turn    TEXT        NOT NULL DEFAULT 'bottom',
  turn_started_at TIMESTAMPTZ,
  winner          TEXT,
  game_status     TEXT        NOT NULL DEFAULT 'waiting',
  move_count      INTEGER     NOT NULL DEFAULT 0,
  ratings_updated BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER games_updated_at BEFORE UPDATE ON games FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE games ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION is_game_participant(game_row games) RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM rooms r WHERE r.id = game_row.room_id AND (r.host_id = auth.uid() OR r.guest_id = auth.uid()));
$$ LANGUAGE sql SECURITY DEFINER STABLE;
CREATE POLICY "games_select_participants" ON games FOR SELECT TO authenticated USING (is_game_participant(games.*));
CREATE POLICY "games_insert_host"         ON games FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM rooms r WHERE r.id = room_id AND r.host_id = auth.uid()));
CREATE POLICY "games_update_participants" ON games FOR UPDATE TO authenticated USING (is_game_participant(games.*)) WITH CHECK (is_game_participant(games.*));

CREATE TABLE moves (
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
CREATE OR REPLACE FUNCTION is_move_participant(move_row moves) RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM games g JOIN rooms r ON r.id = g.room_id WHERE g.id = move_row.game_id AND (r.host_id = auth.uid() OR r.guest_id = auth.uid()));
$$ LANGUAGE sql SECURITY DEFINER STABLE;
CREATE POLICY "moves_select_participants"  ON moves FOR SELECT TO authenticated USING (is_move_participant(moves.*));
CREATE POLICY "moves_insert_acting_player" ON moves FOR INSERT TO authenticated WITH CHECK (auth.uid() = player_id AND EXISTS (SELECT 1 FROM games g JOIN rooms r ON r.id = g.room_id WHERE g.id = game_id AND (r.host_id = auth.uid() OR r.guest_id = auth.uid())));

CREATE TABLE matchmaking_queue (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating     INTEGER     NOT NULL,
  status     TEXT        NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'cancelled')),
  room_id    UUID        REFERENCES rooms(id) ON DELETE SET NULL,
  game_id    UUID        REFERENCES games(id) ON DELETE SET NULL,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  matched_at TIMESTAMPTZ
);
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "queue_select_own" ON matchmaking_queue FOR SELECT TO authenticated USING (auth.uid() = player_id);
CREATE POLICY "queue_insert_own" ON matchmaking_queue FOR INSERT TO authenticated WITH CHECK (auth.uid() = player_id);
CREATE POLICY "queue_cancel_own" ON matchmaking_queue FOR UPDATE TO authenticated USING  (auth.uid() = player_id AND status = 'waiting') WITH CHECK (auth.uid() = player_id AND status = 'cancelled');

CREATE OR REPLACE FUNCTION find_or_create_match(p_player_id UUID, p_rating INTEGER, p_board_state JSONB) RETURNS TABLE (matched BOOLEAN, out_room_id UUID, out_game_id UUID, player_side TEXT) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_opp_entry_id UUID; v_opp_id UUID; v_room_id UUID; v_game_id UUID; v_now TIMESTAMPTZ := NOW();
BEGIN
  UPDATE matchmaking_queue SET status = 'cancelled' WHERE player_id = p_player_id AND status = 'waiting';
  SELECT id, player_id INTO v_opp_entry_id, v_opp_id FROM matchmaking_queue WHERE status = 'waiting' AND player_id != p_player_id ORDER BY ABS(rating - p_rating) ASC, joined_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF v_opp_entry_id IS NOT NULL THEN
    INSERT INTO rooms (host_id, guest_id, status) VALUES (v_opp_id, p_player_id, 'playing') RETURNING id INTO v_room_id;
    INSERT INTO games (room_id, board_state, captured_top, captured_bottom, current_turn, turn_started_at, game_status, move_count) VALUES (v_room_id, p_board_state, '[]', '[]', 'bottom', v_now, 'playing', 0) RETURNING id INTO v_game_id;
    UPDATE matchmaking_queue SET status = 'matched', room_id = v_room_id, game_id = v_game_id, matched_at = v_now WHERE id = v_opp_entry_id;
    INSERT INTO matchmaking_queue (player_id, rating, status, room_id, game_id, matched_at) VALUES (p_player_id, p_rating, 'matched', v_room_id, v_game_id, v_now);
    RETURN QUERY SELECT TRUE, v_room_id, v_game_id, 'bottom'::TEXT;
  ELSE
    INSERT INTO matchmaking_queue (player_id, rating, status) VALUES (p_player_id, p_rating, 'waiting');
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, NULL::TEXT;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION update_elo_ratings(p_game_id UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  K CONSTANT INTEGER := 32; RATING_FLOOR CONSTANT INTEGER := 400; v_done BOOLEAN; v_winner TEXT; v_winner_id UUID; v_loser_id UUID; v_wr INTEGER; v_lr INTEGER; v_e_w NUMERIC; v_d_w INTEGER; v_d_l INTEGER;
BEGIN
  SELECT ratings_updated INTO v_done FROM games WHERE id = p_game_id FOR UPDATE;
  IF v_done THEN RETURN; END IF;
  SELECT g.winner, r.host_id, r.guest_id INTO v_winner, v_winner_id, v_loser_id FROM games g JOIN rooms r ON r.id = g.room_id WHERE g.id = p_game_id;
  IF v_winner = 'top' THEN 
    v_loser_id := v_winner_id; 
    SELECT host_id, guest_id INTO v_winner_id, v_loser_id FROM rooms WHERE id = (SELECT room_id FROM games WHERE id = p_game_id);
  ELSIF v_winner = 'bottom' THEN 
    SELECT guest_id, host_id INTO v_winner_id, v_loser_id FROM rooms WHERE id = (SELECT room_id FROM games WHERE id = p_game_id);
  ELSE RETURN; END IF;
  IF v_winner_id IS NULL OR v_loser_id IS NULL THEN RETURN; END IF;
  SELECT rating INTO v_wr FROM profiles WHERE id = v_winner_id;
  SELECT rating INTO v_lr FROM profiles WHERE id = v_loser_id;
  v_e_w := 1.0 / (1.0 + POWER(10.0, (v_lr::NUMERIC - v_wr::NUMERIC) / 400.0));
  v_d_w := ROUND(K * (1.0 - v_e_w))::INTEGER;
  v_d_l := ROUND(K * (0.0 - v_e_w))::INTEGER;
  UPDATE profiles SET rating = GREATEST(RATING_FLOOR, rating + v_d_w), total_wins = total_wins + 1 WHERE id = v_winner_id;
  UPDATE profiles SET rating = GREATEST(RATING_FLOOR, rating + v_d_l), total_losses = total_losses + 1 WHERE id = v_loser_id;
  UPDATE games SET ratings_updated = true WHERE id = p_game_id;
END;
$$;

CREATE OR REPLACE VIEW leaderboard AS SELECT p.id, p.nickname, p.rating, p.country_code, p.total_wins, p.total_losses, RANK() OVER (ORDER BY p.rating DESC, p.total_wins DESC) AS rank FROM profiles p WHERE p.nickname <> '' ORDER BY rank LIMIT 50;

CREATE OR REPLACE FUNCTION get_leaderboard() RETURNS TABLE (id UUID, nickname TEXT, rating INTEGER, country_code TEXT, total_wins INTEGER, total_losses INTEGER, rank BIGINT) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id, nickname, rating, country_code, total_wins, total_losses, RANK() OVER (ORDER BY rating DESC, total_wins DESC) AS rank FROM profiles WHERE nickname <> '' ORDER BY rank LIMIT 50;
$$;

BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE rooms, games, matchmaking_queue;
COMMIT;
