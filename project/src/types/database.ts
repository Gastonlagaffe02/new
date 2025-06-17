export interface Database {
  public: {
    Tables: {
      teams: {
        Row: {
          team_id: string;
          name: string;
          short_name: string;
          city: string | null;
          stadium: string | null;
          logo_url: string | null;
          jersey: string | null;
          founded_year: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          team_id?: string;
          name: string;
          short_name: string;
          city?: string | null;
          stadium?: string | null;
          logo_url?: string | null;
          jersey?: string | null;
          founded_year?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          team_id?: string;
          name?: string;
          short_name?: string;
          city?: string | null;
          stadium?: string | null;
          logo_url?: string | null;
          jersey?: string | null;
          founded_year?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      players: {
        Row: {
          player_id: string;
          name: string;
          position: 'GK' | 'DEF' | 'MID' | 'FWD';
          team_id: string | null;
          price: number;
          injury_status: 'fit' | 'injured' | 'doubtful';
          total_points: number;
          games_played: number;
          goals_scored: number;
          assists: number;
          clean_sheets: number;
          yellow_cards: number;
          red_cards: number;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          player_id?: string;
          name: string;
          position: 'GK' | 'DEF' | 'MID' | 'FWD';
          team_id?: string | null;
          price?: number;
          injury_status?: 'fit' | 'injured' | 'doubtful';
          total_points?: number;
          games_played?: number;
          goals_scored?: number;
          assists?: number;
          clean_sheets?: number;
          yellow_cards?: number;
          red_cards?: number;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          player_id?: string;
          name?: string;
          position?: 'GK' | 'DEF' | 'MID' | 'FWD';
          team_id?: string | null;
          price?: number;
          injury_status?: 'fit' | 'injured' | 'doubtful';
          total_points?: number;
          games_played?: number;
          goals_scored?: number;
          assists?: number;
          clean_sheets?: number;
          yellow_cards?: number;
          red_cards?: number;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          user_id: string;
          username: string;
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          total_points: number;
          leagues_won: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          username: string;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          total_points?: number;
          leagues_won?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          username?: string;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          total_points?: number;
          leagues_won?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      leagues: {
        Row: {
          league_id: string;
          name: string;
          creator_id: string | null;
          max_participants: number;
          current_participants: number;
          entry_fee: number;
          prize_pool: number;
          scoring_system: any;
          budget_limit: number;
          status: 'draft' | 'active' | 'completed';
          start_date: string | null;
          end_date: string | null;
          gameweek_current: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          league_id?: string;
          name: string;
          creator_id?: string | null;
          max_participants?: number;
          current_participants?: number;
          entry_fee?: number;
          prize_pool?: number;
          scoring_system?: any;
          budget_limit?: number;
          status?: 'draft' | 'active' | 'completed';
          start_date?: string | null;
          end_date?: string | null;
          gameweek_current?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          league_id?: string;
          name?: string;
          creator_id?: string | null;
          max_participants?: number;
          current_participants?: number;
          entry_fee?: number;
          prize_pool?: number;
          scoring_system?: any;
          budget_limit?: number;
          status?: 'draft' | 'active' | 'completed';
          start_date?: string | null;
          end_date?: string | null;
          gameweek_current?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      real_matches: {
        Row: {
          match_id: string;
          gameweek: number;
          home_team_id: string | null;
          away_team_id: string | null;
          home_score: number | null;
          away_score: number | null;
          match_date: string | null;
          status: 'scheduled' | 'live' | 'completed' | 'postponed';
          created_at: string;
        };
        Insert: {
          match_id?: string;
          gameweek: number;
          home_team_id?: string | null;
          away_team_id?: string | null;
          home_score?: number | null;
          away_score?: number | null;
          match_date?: string | null;
          status?: 'scheduled' | 'live' | 'completed' | 'postponed';
          created_at?: string;
        };
        Update: {
          match_id?: string;
          gameweek?: number;
          home_team_id?: string | null;
          away_team_id?: string | null;
          home_score?: number | null;
          away_score?: number | null;
          match_date?: string | null;
          status?: 'scheduled' | 'live' | 'completed' | 'postponed';
          created_at?: string;
        };
      };
      fantasy_teams: {
        Row: {
          fantasy_team_id: string;
          user_id: string | null;
          league_id: string | null;
          team_name: string;
          total_points: number;
          gameweek_points: number;
          rank: number;
          budget_remaining: number;
          transfers_remaining: number;
          transfers_made_this_gw: number;
          transfers_banked: number;
          current_gameweek: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          fantasy_team_id?: string;
          user_id?: string | null;
          league_id?: string | null;
          team_name: string;
          total_points?: number;
          gameweek_points?: number;
          rank?: number;
          budget_remaining?: number;
          transfers_remaining?: number;
          transfers_made_this_gw?: number;
          transfers_banked?: number;
          current_gameweek?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          fantasy_team_id?: string;
          user_id?: string | null;
          league_id?: string | null;
          team_name?: string;
          total_points?: number;
          gameweek_points?: number;
          rank?: number;
          budget_remaining?: number;
          transfers_remaining?: number;
          transfers_made_this_gw?: number;
          transfers_banked?: number;
          current_gameweek?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      rosters: {
        Row: {
          roster_id: string;
          fantasy_team_id: string | null;
          player_id: string | null;
          squad_position: 'starting_gk' | 'backup_gk' | 'starting_def' | 'bench_def' | 'starting_mid' | 'bench_mid' | 'starting_fwd' | 'bench_fwd' | null;
          is_starter: boolean | null;
          is_captain: boolean | null;
          is_vice_captain: boolean | null;
          gameweek_added: number | null;
          purchase_price: number;
          created_at: string;
        };
        Insert: {
          roster_id?: string;
          fantasy_team_id?: string | null;
          player_id?: string | null;
          squad_position?: 'starting_gk' | 'backup_gk' | 'starting_def' | 'bench_def' | 'starting_mid' | 'bench_mid' | 'starting_fwd' | 'bench_fwd' | null;
          is_starter?: boolean | null;
          is_captain?: boolean | null;
          is_vice_captain?: boolean | null;
          gameweek_added?: number | null;
          purchase_price: number;
          created_at?: string;
        };
        Update: {
          roster_id?: string;
          fantasy_team_id?: string | null;
          player_id?: string | null;
          squad_position?: 'starting_gk' | 'backup_gk' | 'starting_def' | 'bench_def' | 'starting_mid' | 'bench_mid' | 'starting_fwd' | 'bench_fwd' | null;
          is_starter?: boolean | null;
          is_captain?: boolean | null;
          is_vice_captain?: boolean | null;
          gameweek_added?: number | null;
          purchase_price?: number;
          created_at?: string;
        };
      };
      gameweek_scores: {
        Row: {
          score_id: string;
          player_id: string | null;
          gameweek: number;
          minutes_played: number | null;
          goals: number | null;
          assists: number | null;
          clean_sheet: boolean | null;
          yellow_cards: number | null;
          red_cards: number | null;
          saves: number | null;
          bonus_points: number | null;
          total_points: number | null;
          created_at: string;
        };
        Insert: {
          score_id?: string;
          player_id?: string | null;
          gameweek: number;
          minutes_played?: number | null;
          goals?: number | null;
          assists?: number | null;
          clean_sheet?: boolean | null;
          yellow_cards?: number | null;
          red_cards?: number | null;
          saves?: number | null;
          bonus_points?: number | null;
          total_points?: number | null;
          created_at?: string;
        };
        Update: {
          score_id?: string;
          player_id?: string | null;
          gameweek?: number;
          minutes_played?: number | null;
          goals?: number | null;
          assists?: number | null;
          clean_sheet?: boolean | null;
          yellow_cards?: number | null;
          red_cards?: number | null;
          saves?: number | null;
          bonus_points?: number | null;
          total_points?: number | null;
          created_at?: string;
        };
      };
      transactions: {
        Row: {
          transaction_id: string;
          fantasy_team_id: string | null;
          player_id: string | null;
          transaction_type: 'draft' | 'transfer_in' | 'transfer_out' | 'captain_change';
          gameweek: number;
          price: number | null;
          transfer_cost: number;
          created_at: string;
        };
        Insert: {
          transaction_id?: string;
          fantasy_team_id?: string | null;
          player_id?: string | null;
          transaction_type: 'draft' | 'transfer_in' | 'transfer_out' | 'captain_change';
          gameweek: number;
          price?: number | null;
          transfer_cost?: number;
          created_at?: string;
        };
        Update: {
          transaction_id?: string;
          fantasy_team_id?: string | null;
          player_id?: string | null;
          transaction_type?: 'draft' | 'transfer_in' | 'transfer_out' | 'captain_change';
          gameweek?: number;
          price?: number | null;
          transfer_cost?: number;
          created_at?: string;
        };
      };
      matchups: {
        Row: {
          matchup_id: string;
          league_id: string | null;
          gameweek: number;
          team1_id: string | null;
          team2_id: string | null;
          team1_points: number | null;
          team2_points: number | null;
          winner_id: string | null;
          status: 'scheduled' | 'in_progress' | 'completed';
          created_at: string;
        };
        Insert: {
          matchup_id?: string;
          league_id?: string | null;
          gameweek: number;
          team1_id?: string | null;
          team2_id?: string | null;
          team1_points?: number | null;
          team2_points?: number | null;
          winner_id?: string | null;
          status?: 'scheduled' | 'in_progress' | 'completed';
          created_at?: string;
        };
        Update: {
          matchup_id?: string;
          league_id?: string | null;
          gameweek?: number;
          team1_id?: string | null;
          team2_id?: string | null;
          team1_points?: number | null;
          team2_points?: number | null;
          winner_id?: string | null;
          status?: 'scheduled' | 'in_progress' | 'completed';
          created_at?: string;
        };
      };
      gameweeks: {
        Row: {
          gameweek_id: number;
          gameweek_number: number;
          start_date: string;
          end_date: string;
          status: 'upcoming' | 'active' | 'locked' | 'finalized';
          created_at: string;
        };
        Insert: {
          gameweek_id?: number;
          gameweek_number: number;
          start_date: string;
          end_date: string;
          status?: 'upcoming' | 'active' | 'locked' | 'finalized';
          created_at?: string;
        };
        Update: {
          gameweek_id?: number;
          gameweek_number?: number;
          start_date?: string;
          end_date?: string;
          status?: 'upcoming' | 'active' | 'locked' | 'finalized';
          created_at?: string;
        };
      };
      fantasy_team_gameweek_points: {
        Row: {
          id: string;
          fantasy_team_id: string;
          gameweek: number;
          points: number;
          rank_in_league: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          fantasy_team_id: string;
          gameweek: number;
          points?: number;
          rank_in_league?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          fantasy_team_id?: string;
          gameweek?: number;
          points?: number;
          rank_in_league?: number | null;
          created_at?: string;
        };
      };
    };
  };
}

export type Team = Database['public']['Tables']['teams']['Row'];
export type Player = Database['public']['Tables']['players']['Row'];
export type User = Database['public']['Tables']['users']['Row'];
export type League = Database['public']['Tables']['leagues']['Row'];
export type RealMatch = Database['public']['Tables']['real_matches']['Row'];
export type FantasyTeam = Database['public']['Tables']['fantasy_teams']['Row'];
export type Roster = Database['public']['Tables']['rosters']['Row'];
export type GameweekScore = Database['public']['Tables']['gameweek_scores']['Row'];
export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type Matchup = Database['public']['Tables']['matchups']['Row'];
export type Gameweek = Database['public']['Tables']['gameweeks']['Row'];
export type FantasyTeamGameweekPoints = Database['public']['Tables']['fantasy_team_gameweek_points']['Row'];