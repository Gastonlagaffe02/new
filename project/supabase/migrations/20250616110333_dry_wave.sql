/*
  # Gameweek Management and Transfer System

  1. New Tables
    - `gameweeks` - Manages gameweek periods and deadlines
    - Updates to existing tables for transfer tracking

  2. New Columns
    - Add transfer tracking columns to fantasy_teams
    - Add gameweek management fields

  3. Security
    - Enable RLS on new tables
    - Add policies for gameweek and transfer management
*/

-- Create gameweeks table for managing gameweek periods
CREATE TABLE IF NOT EXISTS gameweeks (
  gameweek_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gameweek_number INTEGER UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  deadline_time TIMESTAMP WITH TIME ZONE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  is_next BOOLEAN DEFAULT false,
  is_finished BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add transfer tracking columns to fantasy_teams
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fantasy_teams' AND column_name = 'transfers_made_this_gw'
  ) THEN
    ALTER TABLE fantasy_teams ADD COLUMN transfers_made_this_gw INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fantasy_teams' AND column_name = 'transfers_banked'
  ) THEN
    ALTER TABLE fantasy_teams ADD COLUMN transfers_banked INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fantasy_teams' AND column_name = 'current_gameweek'
  ) THEN
    ALTER TABLE fantasy_teams ADD COLUMN current_gameweek INTEGER DEFAULT 1;
  END IF;
END $$;

-- Add transfer cost column to transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'transfer_cost'
  ) THEN
    ALTER TABLE transactions ADD COLUMN transfer_cost INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add jersey column to teams table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'jersey'
  ) THEN
    ALTER TABLE teams ADD COLUMN jersey TEXT;
  END IF;
END $$;

-- Add image_url column to players table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE players ADD COLUMN image_url TEXT;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE gameweeks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gameweeks (readable by all authenticated users)
CREATE POLICY "Gameweeks are viewable by authenticated users"
  ON gameweeks
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert initial gameweeks (38 gameweeks for a full season)
INSERT INTO gameweeks (gameweek_number, name, deadline_time, start_time, end_time, is_current) VALUES
(1, 'Gameweek 1', '2025-01-15 17:30:00+00', '2025-01-15 19:00:00+00', '2025-01-17 23:00:00+00', true),
(2, 'Gameweek 2', '2025-01-22 17:30:00+00', '2025-01-22 19:00:00+00', '2025-01-24 23:00:00+00', false),
(3, 'Gameweek 3', '2025-01-29 17:30:00+00', '2025-01-29 19:00:00+00', '2025-01-31 23:00:00+00', false),
(4, 'Gameweek 4', '2025-02-05 17:30:00+00', '2025-02-05 19:00:00+00', '2025-02-07 23:00:00+00', false),
(5, 'Gameweek 5', '2025-02-12 17:30:00+00', '2025-02-12 19:00:00+00', '2025-02-14 23:00:00+00', false)
ON CONFLICT (gameweek_number) DO NOTHING;

-- Function to update gameweek status
CREATE OR REPLACE FUNCTION update_gameweek_status()
RETURNS void AS $$
BEGIN
  -- Reset all current/next flags
  UPDATE gameweeks SET is_current = false, is_next = false;
  
  -- Set current gameweek
  UPDATE gameweeks 
  SET is_current = true 
  WHERE NOW() >= start_time AND NOW() <= end_time;
  
  -- Set next gameweek
  UPDATE gameweeks 
  SET is_next = true 
  WHERE gameweek_number = (
    SELECT MIN(gameweek_number) 
    FROM gameweeks 
    WHERE start_time > NOW()
  );
  
  -- Mark finished gameweeks
  UPDATE gameweeks 
  SET is_finished = true 
  WHERE end_time < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to reset transfers for new gameweek
CREATE OR REPLACE FUNCTION reset_transfers_for_gameweek()
RETURNS void AS $$
BEGIN
  -- Bank unused transfers (max 1 can be banked, max 2 total)
  UPDATE fantasy_teams 
  SET 
    transfers_banked = LEAST(
      transfers_banked + GREATEST(1 - transfers_made_this_gw, 0), 
      1
    ),
    transfers_made_this_gw = 0,
    current_gameweek = current_gameweek + 1
  WHERE current_gameweek < (
    SELECT MAX(gameweek_number) FROM gameweeks WHERE is_current = true
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if transfers are allowed
CREATE OR REPLACE FUNCTION transfers_allowed()
RETURNS boolean AS $$
DECLARE
  current_time TIMESTAMP WITH TIME ZONE := NOW();
  deadline_passed BOOLEAN;
  gameweek_active BOOLEAN;
BEGIN
  -- Check if we're past deadline or during gameweek
  SELECT 
    current_time > deadline_time,
    current_time >= start_time AND current_time <= end_time
  INTO deadline_passed, gameweek_active
  FROM gameweeks 
  WHERE is_current = true OR is_next = true
  ORDER BY gameweek_number ASC
  LIMIT 1;
  
  -- Transfers not allowed if deadline passed or gameweek is active
  RETURN NOT (COALESCE(deadline_passed, false) OR COALESCE(gameweek_active, false));
END;
$$ LANGUAGE plpgsql;