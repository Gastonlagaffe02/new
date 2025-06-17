/*
  # Add Missing Database Functions and Improvements

  1. Missing Functions
    - transfers_allowed() function
    - update_gameweek_status() function
    - Better gameweek management
    - Player statistics updates

  2. Improvements
    - Add missing indexes for performance
    - Fix RLS policies
    - Add utility functions

  3. Data Integrity
    - Add constraints and checks
    - Improve foreign key relationships
*/

-- Function to check if transfers are currently allowed
CREATE OR REPLACE FUNCTION transfers_allowed()
RETURNS boolean AS $$
DECLARE
    current_time TIMESTAMP WITH TIME ZONE := NOW();
    current_gameweek_status TEXT;
BEGIN
    -- Get current gameweek status
    SELECT status INTO current_gameweek_status
    FROM gameweeks 
    WHERE status IN ('active', 'upcoming')
    ORDER BY gameweek_number ASC
    LIMIT 1;
    
    -- Transfers are allowed only when gameweek is 'upcoming'
    RETURN COALESCE(current_gameweek_status, 'upcoming') = 'upcoming';
END;
$$ LANGUAGE plpgsql;

-- Function to update gameweek status based on current time and match completion
CREATE OR REPLACE FUNCTION update_gameweek_status()
RETURNS void AS $$
DECLARE
    gw_record RECORD;
    total_matches INTEGER;
    completed_matches INTEGER;
BEGIN
    -- Update gameweek statuses based on match completion
    FOR gw_record IN
        SELECT gameweek_number, start_date, end_date, status
        FROM gameweeks
        WHERE status != 'finalized'
        ORDER BY gameweek_number
    LOOP
        -- Count total and completed matches for this gameweek
        SELECT 
            COUNT(*),
            COUNT(CASE WHEN status = 'completed' THEN 1 END)
        INTO total_matches, completed_matches
        FROM real_matches
        WHERE gameweek = gw_record.gameweek_number;
        
        -- Update status based on match completion and dates
        IF completed_matches = total_matches AND total_matches > 0 THEN
            -- All matches completed - ready for finalization
            UPDATE gameweeks
            SET status = 'locked'
            WHERE gameweek_number = gw_record.gameweek_number
              AND status != 'finalized';
        ELSIF completed_matches > 0 THEN
            -- Some matches completed - gameweek is active
            UPDATE gameweeks
            SET status = 'active'
            WHERE gameweek_number = gw_record.gameweek_number
              AND status = 'upcoming';
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to get player statistics for a specific gameweek
CREATE OR REPLACE FUNCTION get_player_gameweek_stats(
    p_player_id UUID,
    p_gameweek INTEGER
)
RETURNS TABLE (
    minutes_played INTEGER,
    goals INTEGER,
    assists INTEGER,
    clean_sheet BOOLEAN,
    yellow_cards INTEGER,
    red_cards INTEGER,
    saves INTEGER,
    bonus_points INTEGER,
    total_points INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(gs.minutes_played, 0)::INTEGER,
        COALESCE(gs.goals, 0)::INTEGER,
        COALESCE(gs.assists, 0)::INTEGER,
        COALESCE(gs.clean_sheet, false),
        COALESCE(gs.yellow_cards, 0)::INTEGER,
        COALESCE(gs.red_cards, 0)::INTEGER,
        COALESCE(gs.saves, 0)::INTEGER,
        COALESCE(gs.bonus_points, 0)::INTEGER,
        COALESCE(gs.total_points, 0)::INTEGER
    FROM gameweek_scores gs
    WHERE gs.player_id = p_player_id 
      AND gs.gameweek = p_gameweek;
    
    -- If no record found, return zeros
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0, 0, 0, false, 0, 0, 0, 0, 0;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate team value
CREATE OR REPLACE FUNCTION calculate_team_value(p_fantasy_team_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    team_value DECIMAL := 0;
BEGIN
    SELECT COALESCE(SUM(p.price), 0) INTO team_value
    FROM rosters r
    JOIN players p ON r.player_id = p.player_id
    WHERE r.fantasy_team_id = p_fantasy_team_id;
    
    RETURN team_value;
END;
$$ LANGUAGE plpgsql;

-- Function to get team formation
CREATE OR REPLACE FUNCTION get_team_formation(p_fantasy_team_id UUID)
RETURNS TEXT AS $$
DECLARE
    defenders INTEGER := 0;
    midfielders INTEGER := 0;
    forwards INTEGER := 0;
BEGIN
    SELECT 
        COUNT(CASE WHEN p.position = 'DEF' THEN 1 END),
        COUNT(CASE WHEN p.position = 'MID' THEN 1 END),
        COUNT(CASE WHEN p.position = 'FWD' THEN 1 END)
    INTO defenders, midfielders, forwards
    FROM rosters r
    JOIN players p ON r.player_id = p.player_id
    WHERE r.fantasy_team_id = p_fantasy_team_id
      AND r.is_starter = true;
    
    RETURN defenders || '-' || midfielders || '-' || forwards;
END;
$$ LANGUAGE plpgsql;

-- Function to validate team formation
CREATE OR REPLACE FUNCTION validate_team_formation(p_fantasy_team_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    gk_count INTEGER := 0;
    def_count INTEGER := 0;
    mid_count INTEGER := 0;
    fwd_count INTEGER := 0;
    total_starters INTEGER := 0;
BEGIN
    SELECT 
        COUNT(CASE WHEN p.position = 'GK' THEN 1 END),
        COUNT(CASE WHEN p.position = 'DEF' THEN 1 END),
        COUNT(CASE WHEN p.position = 'MID' THEN 1 END),
        COUNT(CASE WHEN p.position = 'FWD' THEN 1 END),
        COUNT(*)
    INTO gk_count, def_count, mid_count, fwd_count, total_starters
    FROM rosters r
    JOIN players p ON r.player_id = p.player_id
    WHERE r.fantasy_team_id = p_fantasy_team_id
      AND r.is_starter = true;
    
    -- Valid formation: 1 GK, 3-5 DEF, 2-5 MID, 1-3 FWD, total 11
    RETURN (
        gk_count = 1 AND
        def_count BETWEEN 3 AND 5 AND
        mid_count BETWEEN 2 AND 5 AND
        fwd_count BETWEEN 1 AND 3 AND
        total_starters = 11
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get league standings
CREATE OR REPLACE FUNCTION get_league_standings(p_league_id UUID)
RETURNS TABLE (
    fantasy_team_id UUID,
    team_name TEXT,
    username TEXT,
    total_points INTEGER,
    rank INTEGER,
    gameweek_points INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ft.fantasy_team_id,
        ft.team_name::TEXT,
        u.username::TEXT,
        ft.total_points,
        ft.rank,
        ft.gameweek_points
    FROM fantasy_teams ft
    JOIN users u ON ft.user_id = u.user_id
    WHERE ft.league_id = p_league_id
    ORDER BY ft.rank ASC;
END;
$$ LANGUAGE plpgsql;

-- Add missing indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gameweek_scores_gameweek ON gameweek_scores(gameweek);
CREATE INDEX IF NOT EXISTS idx_gameweek_scores_player_gameweek ON gameweek_scores(player_id, gameweek);
CREATE INDEX IF NOT EXISTS idx_fantasy_teams_league ON fantasy_teams(league_id);
CREATE INDEX IF NOT EXISTS idx_fantasy_teams_user ON fantasy_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_rosters_fantasy_team ON rosters(fantasy_team_id);
CREATE INDEX IF NOT EXISTS idx_rosters_player ON rosters(player_id);
CREATE INDEX IF NOT EXISTS idx_transactions_fantasy_team ON transactions(fantasy_team_id);
CREATE INDEX IF NOT EXISTS idx_real_matches_gameweek ON real_matches(gameweek);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_position ON players(position);

-- Update RLS policies for better security
DROP POLICY IF EXISTS "Users can view own fantasy teams" ON fantasy_teams;
CREATE POLICY "Users can view own fantasy teams"
  ON fantasy_teams FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own rosters" ON rosters;
CREATE POLICY "Users can view own rosters"
  ON rosters FOR SELECT TO authenticated
  USING (
    fantasy_team_id IN (
      SELECT fantasy_team_id FROM fantasy_teams WHERE user_id = auth.uid()
    )
  );

-- Enable RLS on tables that might be missing it
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE real_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE gameweek_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchups ENABLE ROW LEVEL SECURITY;

-- Add public read policies for reference data
CREATE POLICY IF NOT EXISTS "Public read access" ON teams FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Public read access" ON players FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Public read access" ON leagues FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Public read access" ON real_matches FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Public read access" ON gameweek_scores FOR SELECT TO authenticated USING (true);

-- Admin policies for managing data
CREATE POLICY IF NOT EXISTS "Admin can manage teams"
  ON teams FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY IF NOT EXISTS "Admin can manage players"
  ON players FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY IF NOT EXISTS "Admin can manage real matches"
  ON real_matches FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY IF NOT EXISTS "Admin can manage gameweek scores"
  ON gameweek_scores FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Users can manage their own profile
CREATE POLICY IF NOT EXISTS "Users can view own profile"
  ON users FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can update own profile"
  ON users FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin can view and manage all users
CREATE POLICY IF NOT EXISTS "Admin can view all users"
  ON users FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u2 
      WHERE u2.user_id = auth.uid() AND u2.role = 'admin'
    )
  );

CREATE POLICY IF NOT EXISTS "Admin can manage all users"
  ON users FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u2 
      WHERE u2.user_id = auth.uid() AND u2.role = 'admin'
    )
  );

-- Fantasy team management policies
CREATE POLICY IF NOT EXISTS "Users can create fantasy teams"
  ON fantasy_teams FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can update own fantasy teams"
  ON fantasy_teams FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Roster management policies
CREATE POLICY IF NOT EXISTS "Users can manage own rosters"
  ON rosters FOR ALL TO authenticated
  USING (
    fantasy_team_id IN (
      SELECT fantasy_team_id FROM fantasy_teams WHERE user_id = auth.uid()
    )
  );

-- Transaction policies
CREATE POLICY IF NOT EXISTS "Users can view own transactions"
  ON transactions FOR SELECT TO authenticated
  USING (
    fantasy_team_id IN (
      SELECT fantasy_team_id FROM fantasy_teams WHERE user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Admin can manage all transactions"
  ON transactions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Service role policies for system operations
CREATE POLICY IF NOT EXISTS "Service role full access"
  ON fantasy_teams FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Service role full access"
  ON rosters FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Service role full access"
  ON gameweek_scores FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Service role full access"
  ON transactions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Function to refresh materialized views (if any are added later)
CREATE OR REPLACE FUNCTION refresh_stats()
RETURNS void AS $$
BEGIN
    -- Update player total points from gameweek scores
    UPDATE players 
    SET total_points = COALESCE((
        SELECT SUM(total_points) 
        FROM gameweek_scores 
        WHERE player_id = players.player_id
    ), 0);
    
    -- Update games played
    UPDATE players 
    SET games_played = COALESCE((
        SELECT COUNT(*) 
        FROM gameweek_scores 
        WHERE player_id = players.player_id 
          AND minutes_played > 0
    ), 0);
    
    -- Update goals and assists
    UPDATE players 
    SET 
        goals_scored = COALESCE((
            SELECT SUM(goals) 
            FROM gameweek_scores 
            WHERE player_id = players.player_id
        ), 0),
        assists = COALESCE((
            SELECT SUM(assists) 
            FROM gameweek_scores 
            WHERE player_id = players.player_id
        ), 0),
        clean_sheets = COALESCE((
            SELECT COUNT(*) 
            FROM gameweek_scores 
            WHERE player_id = players.player_id 
              AND clean_sheet = true
        ), 0),
        yellow_cards = COALESCE((
            SELECT SUM(yellow_cards) 
            FROM gameweek_scores 
            WHERE player_id = players.player_id
        ), 0),
        red_cards = COALESCE((
            SELECT SUM(red_cards) 
            FROM gameweek_scores 
            WHERE player_id = players.player_id
        ), 0);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update player stats when gameweek scores change
CREATE OR REPLACE FUNCTION update_player_stats_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the player's cumulative stats
    UPDATE players 
    SET 
        total_points = COALESCE((
            SELECT SUM(total_points) 
            FROM gameweek_scores 
            WHERE player_id = NEW.player_id
        ), 0),
        goals_scored = COALESCE((
            SELECT SUM(goals) 
            FROM gameweek_scores 
            WHERE player_id = NEW.player_id
        ), 0),
        assists = COALESCE((
            SELECT SUM(assists) 
            FROM gameweek_scores 
            WHERE player_id = NEW.player_id
        ), 0),
        updated_at = NOW()
    WHERE player_id = NEW.player_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_player_stats ON gameweek_scores;
CREATE TRIGGER update_player_stats
    AFTER INSERT OR UPDATE ON gameweek_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_player_stats_trigger();