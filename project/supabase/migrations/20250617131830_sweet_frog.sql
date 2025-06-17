/*
  # Gameweek Management System

  1. New Tables and Updates
    - Update gameweeks table structure
    - Add fantasy_team_gameweek_points table
    - Add general league setup

  2. Functions
    - Auto-generate gameweeks from real_matches
    - Calculate fantasy team points
    - Finalize gameweek process
    - Auto-substitution logic

  3. Security
    - Enable RLS on new tables
    - Add appropriate policies
*/

-- Update gameweeks table structure to match requirements
DROP TABLE IF EXISTS gameweeks CASCADE;
CREATE TABLE gameweeks (
    gameweek_id SERIAL PRIMARY KEY,
    gameweek_number INTEGER UNIQUE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'locked', 'finalized')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create fantasy_team_gameweek_points table
CREATE TABLE IF NOT EXISTS fantasy_team_gameweek_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fantasy_team_id UUID REFERENCES fantasy_teams(fantasy_team_id) ON DELETE CASCADE,
    gameweek INTEGER NOT NULL,
    points INTEGER DEFAULT 0,
    rank_in_league INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(fantasy_team_id, gameweek)
);

-- Enable RLS
ALTER TABLE gameweeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_team_gameweek_points ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Gameweeks are viewable by authenticated users"
  ON gameweeks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Fantasy team gameweek points are viewable by team owner"
  ON fantasy_team_gameweek_points FOR SELECT TO authenticated
  USING (
    fantasy_team_id IN (
      SELECT fantasy_team_id FROM fantasy_teams WHERE user_id = auth.uid()
    )
  );

-- Function to generate gameweeks from real_matches
CREATE OR REPLACE FUNCTION generate_gameweeks_from_matches()
RETURNS void AS $$
DECLARE
    gw_record RECORD;
BEGIN
    -- Clear existing gameweeks
    DELETE FROM gameweeks;
    
    -- Generate gameweeks from real_matches
    FOR gw_record IN
        SELECT 
            gameweek,
            MIN(DATE(match_date)) as start_date,
            MAX(DATE(match_date)) as end_date,
            CASE 
                WHEN COUNT(*) = COUNT(CASE WHEN status = 'completed' THEN 1 END) THEN 'finalized'
                ELSE 'upcoming'
            END as status
        FROM real_matches 
        WHERE match_date IS NOT NULL
        GROUP BY gameweek
        ORDER BY gameweek
    LOOP
        INSERT INTO gameweeks (gameweek_number, start_date, end_date, status)
        VALUES (gw_record.gameweek, gw_record.start_date, gw_record.end_date, gw_record.status);
    END LOOP;
    
    RAISE NOTICE 'Generated % gameweeks from real_matches', (SELECT COUNT(*) FROM gameweeks);
END;
$$ LANGUAGE plpgsql;

-- Function to get auto-substitution for a player
CREATE OR REPLACE FUNCTION get_auto_substitute(
    p_fantasy_team_id UUID,
    p_gameweek INTEGER,
    p_position TEXT
)
RETURNS UUID AS $$
DECLARE
    substitute_id UUID;
BEGIN
    -- Find bench player of same position with minutes > 0
    SELECT r.player_id INTO substitute_id
    FROM rosters r
    JOIN gameweek_scores gs ON r.player_id = gs.player_id
    JOIN players p ON r.player_id = p.player_id
    WHERE r.fantasy_team_id = p_fantasy_team_id
      AND r.is_starter = false
      AND p.position = p_position
      AND gs.gameweek = p_gameweek
      AND COALESCE(gs.minutes_played, 0) > 0
    ORDER BY gs.total_points DESC
    LIMIT 1;
    
    RETURN substitute_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate fantasy team points for a gameweek
CREATE OR REPLACE FUNCTION calculate_fantasy_team_points(
    p_fantasy_team_id UUID,
    p_gameweek INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    total_points INTEGER := 0;
    player_record RECORD;
    captain_id UUID;
    vice_captain_id UUID;
    captain_points INTEGER := 0;
    vice_captain_points INTEGER := 0;
    substitute_id UUID;
BEGIN
    -- Get captain and vice captain
    SELECT player_id INTO captain_id
    FROM rosters 
    WHERE fantasy_team_id = p_fantasy_team_id AND is_captain = true;
    
    SELECT player_id INTO vice_captain_id
    FROM rosters 
    WHERE fantasy_team_id = p_fantasy_team_id AND is_vice_captain = true;
    
    -- Calculate points for starting players
    FOR player_record IN
        SELECT 
            r.player_id,
            r.is_captain,
            r.is_vice_captain,
            p.position,
            COALESCE(gs.total_points, 0) as player_points,
            COALESCE(gs.minutes_played, 0) as minutes_played
        FROM rosters r
        JOIN players p ON r.player_id = p.player_id
        LEFT JOIN gameweek_scores gs ON r.player_id = gs.player_id AND gs.gameweek = p_gameweek
        WHERE r.fantasy_team_id = p_fantasy_team_id AND r.is_starter = true
    LOOP
        -- Check if player needs substitution (0 minutes)
        IF player_record.minutes_played = 0 THEN
            substitute_id := get_auto_substitute(p_fantasy_team_id, p_gameweek, player_record.position);
            
            IF substitute_id IS NOT NULL THEN
                -- Use substitute's points
                SELECT COALESCE(gs.total_points, 0) INTO player_record.player_points
                FROM gameweek_scores gs
                WHERE gs.player_id = substitute_id AND gs.gameweek = p_gameweek;
            END IF;
        END IF;
        
        -- Add player points
        total_points := total_points + player_record.player_points;
        
        -- Track captain/vice captain points for multiplier
        IF player_record.player_id = captain_id THEN
            captain_points := player_record.player_points;
        ELSIF player_record.player_id = vice_captain_id THEN
            vice_captain_points := player_record.player_points;
        END IF;
    END LOOP;
    
    -- Apply captain multiplier (2x points)
    IF captain_points > 0 THEN
        total_points := total_points + captain_points; -- Double captain points
    ELSIF vice_captain_points > 0 THEN
        total_points := total_points + vice_captain_points; -- Double vice captain if captain didn't play
    END IF;
    
    RETURN total_points;
END;
$$ LANGUAGE plpgsql;

-- Function to finalize gameweek and calculate all team points
CREATE OR REPLACE FUNCTION finalize_gameweek(p_gameweek INTEGER)
RETURNS void AS $$
DECLARE
    team_record RECORD;
    team_points INTEGER;
    league_record RECORD;
BEGIN
    -- Check if gameweek exists and can be finalized
    IF NOT EXISTS (SELECT 1 FROM gameweeks WHERE gameweek_number = p_gameweek) THEN
        RAISE EXCEPTION 'Gameweek % does not exist', p_gameweek;
    END IF;
    
    -- Calculate points for all fantasy teams
    FOR team_record IN
        SELECT fantasy_team_id, league_id
        FROM fantasy_teams
        WHERE league_id IS NOT NULL
    LOOP
        -- Calculate team points
        team_points := calculate_fantasy_team_points(team_record.fantasy_team_id, p_gameweek);
        
        -- Insert/update gameweek points
        INSERT INTO fantasy_team_gameweek_points (fantasy_team_id, gameweek, points)
        VALUES (team_record.fantasy_team_id, p_gameweek, team_points)
        ON CONFLICT (fantasy_team_id, gameweek)
        DO UPDATE SET points = EXCLUDED.points;
        
        -- Update total points in fantasy_teams
        UPDATE fantasy_teams
        SET total_points = total_points + team_points,
            gameweek_points = team_points
        WHERE fantasy_team_id = team_record.fantasy_team_id;
    END LOOP;
    
    -- Calculate ranks within each league
    FOR league_record IN
        SELECT DISTINCT league_id FROM fantasy_teams WHERE league_id IS NOT NULL
    LOOP
        WITH ranked_teams AS (
            SELECT 
                ftgp.fantasy_team_id,
                ROW_NUMBER() OVER (ORDER BY ftgp.points DESC) as rank
            FROM fantasy_team_gameweek_points ftgp
            JOIN fantasy_teams ft ON ftgp.fantasy_team_id = ft.fantasy_team_id
            WHERE ft.league_id = league_record.league_id
              AND ftgp.gameweek = p_gameweek
        )
        UPDATE fantasy_team_gameweek_points
        SET rank_in_league = ranked_teams.rank
        FROM ranked_teams
        WHERE fantasy_team_gameweek_points.fantasy_team_id = ranked_teams.fantasy_team_id
          AND fantasy_team_gameweek_points.gameweek = p_gameweek;
        
        -- Update overall ranks in fantasy_teams table
        WITH overall_ranked AS (
            SELECT 
                ft.fantasy_team_id,
                ROW_NUMBER() OVER (ORDER BY ft.total_points DESC) as rank
            FROM fantasy_teams ft
            WHERE ft.league_id = league_record.league_id
        )
        UPDATE fantasy_teams
        SET rank = overall_ranked.rank
        FROM overall_ranked
        WHERE fantasy_teams.fantasy_team_id = overall_ranked.fantasy_team_id;
    END LOOP;
    
    -- Mark gameweek as finalized
    UPDATE gameweeks
    SET status = 'finalized'
    WHERE gameweek_number = p_gameweek;
    
    RAISE NOTICE 'Gameweek % finalized successfully', p_gameweek;
END;
$$ LANGUAGE plpgsql;

-- Function to set gameweek status
CREATE OR REPLACE FUNCTION set_gameweek_status(p_gameweek INTEGER, p_status TEXT)
RETURNS void AS $$
BEGIN
    IF p_status NOT IN ('upcoming', 'active', 'locked', 'finalized') THEN
        RAISE EXCEPTION 'Invalid status: %', p_status;
    END IF;
    
    UPDATE gameweeks
    SET status = p_status
    WHERE gameweek_number = p_gameweek;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Gameweek % not found', p_gameweek;
    END IF;
    
    RAISE NOTICE 'Gameweek % status set to %', p_gameweek, p_status;
END;
$$ LANGUAGE plpgsql;

-- Function to create general league and auto-assign users
CREATE OR REPLACE FUNCTION setup_general_league()
RETURNS UUID AS $$
DECLARE
    general_league_id UUID;
BEGIN
    -- Create general league if it doesn't exist
    INSERT INTO leagues (
        name,
        max_participants,
        current_participants,
        entry_fee,
        prize_pool,
        budget_limit,
        status,
        gameweek_current
    ) VALUES (
        'General League',
        1000,
        0,
        0,
        0,
        100,
        'active',
        1
    )
    ON CONFLICT (name) DO NOTHING
    RETURNING league_id INTO general_league_id;
    
    -- If league already exists, get its ID
    IF general_league_id IS NULL THEN
        SELECT league_id INTO general_league_id
        FROM leagues
        WHERE name = 'General League';
    END IF;
    
    RETURN general_league_id;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-create fantasy team for new user
CREATE OR REPLACE FUNCTION create_default_fantasy_team(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    general_league_id UUID;
    new_team_id UUID;
    username_val TEXT;
BEGIN
    -- Get general league
    general_league_id := setup_general_league();
    
    -- Get username
    SELECT username INTO username_val FROM users WHERE user_id = p_user_id;
    
    -- Create fantasy team
    INSERT INTO fantasy_teams (
        user_id,
        league_id,
        team_name,
        total_points,
        gameweek_points,
        rank,
        budget_remaining,
        transfers_remaining
    ) VALUES (
        p_user_id,
        general_league_id,
        COALESCE(username_val, 'Team') || '''s Team',
        0,
        0,
        1,
        100,
        2
    )
    RETURNING fantasy_team_id INTO new_team_id;
    
    -- Update league participant count
    UPDATE leagues
    SET current_participants = current_participants + 1
    WHERE league_id = general_league_id;
    
    RETURN new_team_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create fantasy team on user creation
CREATE OR REPLACE FUNCTION trigger_create_fantasy_team()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_default_fantasy_team(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_fantasy_team ON users;
CREATE TRIGGER auto_create_fantasy_team
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_fantasy_team();

-- Initialize the system
SELECT setup_general_league();
SELECT generate_gameweeks_from_matches();