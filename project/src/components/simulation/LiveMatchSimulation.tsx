import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Clock, Users, Target, AlertTriangle, Trophy, Plus, Minus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { RealMatch, Player, Team } from '../../types/database';
import toast from 'react-hot-toast';

interface PlayerWithTeam extends Player {
  team_name?: string;
  team_short_name?: string;
}

interface PlayerStats {
  player_id: string;
  minutes_played: number;
  goals: number;
  assists: number;
  clean_sheet: boolean;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  penalty_saves: number;
  penalty_misses: number;
  own_goals: number;
  goals_conceded: number;
  bonus_points: number;
  total_points: number;
  is_playing: boolean;
  substituted_at?: number;
}

interface MatchEvent {
  id: string;
  minute: number;
  type: 'goal' | 'assist' | 'yellow_card' | 'red_card' | 'substitution' | 'penalty_save' | 'penalty_miss' | 'own_goal' | 'save';
  player_id: string;
  player_name: string;
  description: string;
}

export default function LiveMatchSimulation() {
  const [matches, setMatches] = useState<(RealMatch & { home_team_name?: string; away_team_name?: string })[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<RealMatch | null>(null);
  const [homePlayers, setHomePlayers] = useState<PlayerWithTeam[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<PlayerWithTeam[]>([]);
  const [playerStats, setPlayerStats] = useState<Record<string, PlayerStats>>({});
  const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameweek, setGameweek] = useState(1);
  const [loading, setLoading] = useState(true);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);

  useEffect(() => {
    fetchMatches();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && !isPaused) {
      interval = setInterval(() => {
        setCurrentMinute(prev => {
          const newMinute = prev + 1;
          
          // Full time at 90 seconds (90 minutes)
          if (newMinute >= 90) {
            setIsRunning(false);
            toast.success('Full Time! Match simulation completed.');
            calculateFinalPoints();
            return 90;
          }
          
          return newMinute;
        });
      }, 1000); // 1 second = 1 minute
    }
    
    return () => clearInterval(interval);
  }, [isRunning, isPaused]);

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('real_matches')
        .select(`
          *,
          home_team:home_team_id (
            name,
            short_name
          ),
          away_team:away_team_id (
            name,
            short_name
          )
        `)
        .eq('status', 'scheduled')
        .order('match_date', { ascending: true });

      if (error) throw error;
      
      const matchesWithTeamNames = data?.map(match => ({
        ...match,
        home_team_name: match.home_team?.name,
        away_team_name: match.away_team?.name
      })) || [];
      
      setMatches(matchesWithTeamNames);
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast.error('Failed to fetch matches');
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchPlayers = async (match: RealMatch) => {
    try {
      // Fetch home team players
      const { data: homePlayersData, error: homeError } = await supabase
        .from('players')
        .select(`
          *,
          teams:team_id (
            name,
            short_name
          )
        `)
        .eq('team_id', match.home_team_id);

      if (homeError) throw homeError;

      // Fetch away team players
      const { data: awayPlayersData, error: awayError } = await supabase
        .from('players')
        .select(`
          *,
          teams:team_id (
            name,
            short_name
          )
        `)
        .eq('team_id', match.away_team_id);

      if (awayError) throw awayError;

      const homePlayersWithTeam = homePlayersData?.map(player => ({
        ...player,
        team_name: player.teams?.name,
        team_short_name: player.teams?.short_name
      })) || [];

      const awayPlayersWithTeam = awayPlayersData?.map(player => ({
        ...player,
        team_name: player.teams?.name,
        team_short_name: player.teams?.short_name
      })) || [];

      setHomePlayers(homePlayersWithTeam);
      setAwayPlayers(awayPlayersWithTeam);

      // Initialize player stats
      const initialStats: Record<string, PlayerStats> = {};
      [...homePlayersWithTeam, ...awayPlayersWithTeam].forEach(player => {
        initialStats[player.player_id] = {
          player_id: player.player_id,
          minutes_played: 0,
          goals: 0,
          assists: 0,
          clean_sheet: false,
          yellow_cards: 0,
          red_cards: 0,
          saves: 0,
          penalty_saves: 0,
          penalty_misses: 0,
          own_goals: 0,
          goals_conceded: 0,
          bonus_points: 0,
          total_points: 0,
          is_playing: true,
        };
      });
      setPlayerStats(initialStats);
    } catch (error) {
      console.error('Error fetching players:', error);
      toast.error('Failed to fetch players');
    }
  };

  const calculatePlayerPoints = (playerId: string): number => {
    const stats = playerStats[playerId];
    if (!stats) return 0;

    const player = [...homePlayers, ...awayPlayers].find(p => p.player_id === playerId);
    if (!player) return 0;

    let points = 0;

    // Minutes played points
    if (stats.minutes_played > 0 && stats.minutes_played < 60) {
      points += 1;
    } else if (stats.minutes_played >= 60) {
      points += 2;
    }

    // Goals points based on position
    if (stats.goals > 0) {
      switch (player.position) {
        case 'GK':
          points += stats.goals * 10;
          break;
        case 'DEF':
          points += stats.goals * 6;
          break;
        case 'MID':
          points += stats.goals * 5;
          break;
        case 'FWD':
          points += stats.goals * 4;
          break;
      }
    }

    // Assists
    points += stats.assists * 3;

    // Clean sheet points
    if (stats.clean_sheet) {
      if (player.position === 'GK' || player.position === 'DEF') {
        points += 4;
      } else if (player.position === 'MID') {
        points += 1;
      }
    }

    // Goalkeeper specific points
    if (player.position === 'GK') {
      points += Math.floor(stats.saves / 3); // 1 point for every 3 saves
      points += stats.penalty_saves * 5;
      points -= Math.floor(stats.goals_conceded / 2); // -1 for every 2 goals conceded
    }

    // Defender specific points
    if (player.position === 'DEF') {
      points -= Math.floor(stats.goals_conceded / 2); // -1 for every 2 goals conceded
    }

    // Penalty misses
    points -= stats.penalty_misses * 2;

    // Cards
    points -= stats.yellow_cards * 1;
    points -= stats.red_cards * 3;

    // Own goals
    points -= stats.own_goals * 2;

    // Bonus points
    points += stats.bonus_points;

    return Math.max(0, points); // Minimum 0 points
  };

  const addMatchEvent = (type: MatchEvent['type'], playerId: string, description?: string) => {
    const player = [...homePlayers, ...awayPlayers].find(p => p.player_id === playerId);
    if (!player) return;

    // Auto-pause the match when an event occurs
    setIsPaused(true);

    const event: MatchEvent = {
      id: `${Date.now()}-${Math.random()}`,
      minute: currentMinute,
      type,
      player_id: playerId,
      player_name: player.name,
      description: description || `${player.name} - ${type.replace('_', ' ')}`
    };

    setMatchEvents(prev => [...prev, event]);

    // Update player stats
    setPlayerStats(prev => {
      const updated = { ...prev };
      const stats = updated[playerId];

      switch (type) {
        case 'goal':
          stats.goals += 1;
          if (player.team_id === selectedMatch?.home_team_id) {
            setHomeScore(prev => prev + 1);
          } else {
            setAwayScore(prev => prev + 1);
          }
          break;
        case 'assist':
          stats.assists += 1;
          break;
        case 'yellow_card':
          stats.yellow_cards += 1;
          break;
        case 'red_card':
          stats.red_cards += 1;
          stats.is_playing = false;
          stats.substituted_at = currentMinute;
          break;
        case 'penalty_save':
          stats.penalty_saves += 1;
          stats.saves += 1;
          break;
        case 'penalty_miss':
          stats.penalty_misses += 1;
          break;
        case 'own_goal':
          stats.own_goals += 1;
          if (player.team_id === selectedMatch?.home_team_id) {
            setAwayScore(prev => prev + 1);
          } else {
            setHomeScore(prev => prev + 1);
          }
          break;
        case 'save':
          stats.saves += 1;
          break;
        case 'substitution':
          stats.is_playing = false;
          stats.substituted_at = currentMinute;
          break;
      }

      // Recalculate total points
      stats.total_points = calculatePlayerPoints(playerId);
      
      return updated;
    });

    toast.success(`${event.description} at ${currentMinute}'`);
  };

  const updateMinutesPlayed = () => {
    setPlayerStats(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(playerId => {
        const stats = updated[playerId];
        if (stats.is_playing) {
          stats.minutes_played = currentMinute;
          stats.total_points = calculatePlayerPoints(playerId);
        }
      });
      return updated;
    });
  };

  useEffect(() => {
    if (currentMinute > 0) {
      updateMinutesPlayed();
    }
  }, [currentMinute]);

  const calculateFinalPoints = () => {
    // Calculate clean sheets
    setPlayerStats(prev => {
      const updated = { ...prev };
      
      // Home team clean sheet
      if (awayScore === 0) {
        homePlayers.forEach(player => {
          if (player.position === 'GK' || player.position === 'DEF') {
            updated[player.player_id].clean_sheet = true;
          } else if (player.position === 'MID') {
            updated[player.player_id].clean_sheet = true;
          }
        });
      }

      // Away team clean sheet
      if (homeScore === 0) {
        awayPlayers.forEach(player => {
          if (player.position === 'GK' || player.position === 'DEF') {
            updated[player.player_id].clean_sheet = true;
          } else if (player.position === 'MID') {
            updated[player.player_id].clean_sheet = true;
          }
        });
      }

      // Update goals conceded for goalkeepers and defenders
      homePlayers.forEach(player => {
        if (player.position === 'GK' || player.position === 'DEF') {
          updated[player.player_id].goals_conceded = awayScore;
        }
      });

      awayPlayers.forEach(player => {
        if (player.position === 'GK' || player.position === 'DEF') {
          updated[player.player_id].goals_conceded = homeScore;
        }
      });

      // Recalculate all points
      Object.keys(updated).forEach(playerId => {
        updated[playerId].total_points = calculatePlayerPoints(playerId);
      });

      return updated;
    });
  };

  const calculateBonusPoints = () => {
    // Get all players sorted by total points
    const allPlayers = Object.values(playerStats)
      .map(stats => ({
        ...stats,
        player: [...homePlayers, ...awayPlayers].find(p => p.player_id === stats.player_id)
      }))
      .filter(p => p.player && p.minutes_played > 0)
      .sort((a, b) => b.total_points - a.total_points);

    // Award bonus points to top 3 performers
    if (allPlayers.length >= 1) {
      allPlayers[0].bonus_points += 3; // 1st place
    }
    if (allPlayers.length >= 2) {
      allPlayers[1].bonus_points += 2; // 2nd place
    }
    if (allPlayers.length >= 3) {
      allPlayers[2].bonus_points += 1; // 3rd place
    }

    // Update player stats with bonus points
    setPlayerStats(prev => {
      const updated = { ...prev };
      allPlayers.forEach(player => {
        if (updated[player.player_id]) {
          updated[player.player_id].bonus_points = player.bonus_points;
          updated[player.player_id].total_points = calculatePlayerPoints(player.player_id);
        }
      });
      return updated;
    });

    return allPlayers.slice(0, 3);
  };

  const updatePlayerDatabase = async () => {
    try {
      const updatePromises = Object.values(playerStats).map(async (stats) => {
        const player = [...homePlayers, ...awayPlayers].find(p => p.player_id === stats.player_id);
        if (!player) return;

        // Update player's cumulative stats
        const { error } = await supabase
          .from('players')
          .update({
            total_points: player.total_points + stats.total_points,
            games_played: player.games_played + (stats.minutes_played > 0 ? 1 : 0),
            goals_scored: player.goals_scored + stats.goals,
            assists: player.assists + stats.assists,
            clean_sheets: player.clean_sheets + (stats.clean_sheet ? 1 : 0),
            yellow_cards: player.yellow_cards + stats.yellow_cards,
            red_cards: player.red_cards + stats.red_cards,
            updated_at: new Date().toISOString()
          })
          .eq('player_id', stats.player_id);

        if (error) throw error;
      });

      await Promise.all(updatePromises);
      toast.success('Player database updated successfully!');
    } catch (error) {
      console.error('Error updating player database:', error);
      toast.error('Failed to update player database');
    }
  };

  const saveMatchResults = async () => {
    if (!selectedMatch) return;

    try {
      // Calculate bonus points first
      const topPerformers = calculateBonusPoints();

      // Update match with final score
      const { error: matchError } = await supabase
        .from('real_matches')
        .update({
          home_score: homeScore,
          away_score: awayScore,
          status: 'completed'
        })
        .eq('match_id', selectedMatch.match_id);

      if (matchError) throw matchError;

      // Save gameweek scores for each player
      const gameweekScores = Object.values(playerStats).map(stats => ({
        player_id: stats.player_id,
        gameweek: gameweek,
        minutes_played: stats.minutes_played,
        goals: stats.goals,
        assists: stats.assists,
        clean_sheet: stats.clean_sheet,
        yellow_cards: stats.yellow_cards,
        red_cards: stats.red_cards,
        saves: stats.saves,
        bonus_points: stats.bonus_points,
        total_points: stats.total_points
      }));

      const { error: scoresError } = await supabase
        .from('gameweek_scores')
        .upsert(gameweekScores, {
          onConflict: 'player_id,gameweek'
        });

      if (scoresError) throw scoresError;

      // Update player database with cumulative stats
      await updatePlayerDatabase();

      // Show top performers
      if (topPerformers.length > 0) {
        toast.success(
          `Top Performers: 1st: ${topPerformers[0]?.player?.name} (${topPerformers[0]?.total_points}pts), ` +
          `2nd: ${topPerformers[1]?.player?.name} (${topPerformers[1]?.total_points}pts), ` +
          `3rd: ${topPerformers[2]?.player?.name} (${topPerformers[2]?.total_points}pts)`,
          { duration: 5000 }
        );
      }

      toast.success('Match results saved successfully!');
      
      // Reset simulation
      resetSimulation();
    } catch (error) {
      console.error('Error saving match results:', error);
      toast.error('Failed to save match results');
    }
  };

  const resetSimulation = () => {
    setCurrentMinute(0);
    setIsRunning(false);
    setIsPaused(false);
    setHomeScore(0);
    setAwayScore(0);
    setMatchEvents([]);
    setPlayerStats({});
    setSelectedMatch(null);
    setHomePlayers([]);
    setAwayPlayers([]);
  };

  const startMatch = () => {
    if (!selectedMatch) {
      toast.error('Please select a match first');
      return;
    }
    setIsRunning(true);
    setIsPaused(false);
  };

  const pauseMatch = () => {
    setIsPaused(true);
  };

  const resumeMatch = () => {
    setIsPaused(false);
    setIsRunning(true);
  };

  const stopMatch = () => {
    setIsRunning(false);
    setIsPaused(false);
    calculateFinalPoints();
    toast.info('Match stopped. You can save results or reset.');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Live Match Simulation</h1>
        <p className="text-gray-600">
          Simulate live matches and calculate player points in real-time. 90 seconds = 90 minutes.
        </p>
      </div>

      {/* Match Selection */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Match</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gameweek
            </label>
            <input
              type="number"
              value={gameweek}
              onChange={(e) => setGameweek(parseInt(e.target.value))}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Match
            </label>
            <select
              value={selectedMatch?.match_id || ''}
              onChange={(e) => {
                const match = matches.find(m => m.match_id === e.target.value);
                setSelectedMatch(match || null);
                if (match) {
                  fetchMatchPlayers(match);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Select a match</option>
              {matches.map(match => (
                <option key={match.match_id} value={match.match_id}>
                  {match.home_team_name} vs {match.away_team_name} - GW{match.gameweek}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedMatch && (
        <>
          {/* Match Controls */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="text-2xl font-bold text-gray-900">
                  {selectedMatch.home_team_name} {homeScore} - {awayScore} {selectedMatch.away_team_name}
                </div>
                <div className="flex items-center text-lg text-gray-600">
                  <Clock className="h-5 w-5 mr-2" />
                  {currentMinute}'
                  {isPaused && <span className="ml-2 text-yellow-600 font-medium">PAUSED</span>}
                  {currentMinute >= 90 && <span className="ml-2 text-red-600 font-medium">FULL TIME</span>}
                </div>
              </div>
              
              <div className="flex space-x-2">
                {!isRunning && currentMinute === 0 && (
                  <button
                    onClick={startMatch}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Match
                  </button>
                )}
                
                {isRunning && !isPaused && (
                  <button
                    onClick={pauseMatch}
                    className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors flex items-center"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </button>
                )}
                
                {isPaused && currentMinute < 90 && (
                  <button
                    onClick={resumeMatch}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </button>
                )}
                
                {(isRunning || isPaused) && (
                  <button
                    onClick={stopMatch}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Stop
                  </button>
                )}
                
                {currentMinute >= 90 && (
                  <button
                    onClick={saveMatchResults}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors flex items-center"
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    Save Results
                  </button>
                )}
                
                <button
                  onClick={resetSimulation}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className="bg-emerald-600 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${(currentMinute / 90) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Quick Actions */}
          {currentMinute > 0 && currentMinute < 90 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                {[...homePlayers, ...awayPlayers]
                  .filter(player => playerStats[player.player_id]?.is_playing)
                  .map(player => (
                  <div key={player.player_id} className="relative">
                    <select
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value) {
                          addMatchEvent(value as MatchEvent['type'], player.player_id);
                          // Reset the select value to prevent double execution
                          e.target.value = '';
                        }
                      }}
                      className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="">{player.name.split(' ')[0]}</option>
                      <option value="goal">Goal</option>
                      <option value="assist">Assist</option>
                      <option value="yellow_card">Yellow Card</option>
                      <option value="red_card">Red Card</option>
                      <option value="substitution">Substitution</option>
                      {player.position === 'GK' && (
                        <>
                          <option value="save">Save</option>
                          <option value="penalty_save">Penalty Save</option>
                        </>
                      )}
                      <option value="penalty_miss">Penalty Miss</option>
                      <option value="own_goal">Own Goal</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Teams and Player Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Home Team */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2" />
                {selectedMatch.home_team_name}
              </h3>
              <div className="space-y-2">
                {homePlayers.map(player => {
                  const stats = playerStats[player.player_id];
                  return (
                    <div key={player.player_id} className={`p-3 rounded-lg border ${
                      stats?.is_playing ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-gray-900">{player.name}</div>
                          <div className="text-sm text-gray-500">{player.position}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-emerald-600">{stats?.total_points || 0} pts</div>
                          <div className="text-xs text-gray-500">{stats?.minutes_played || 0}'</div>
                        </div>
                      </div>
                      {stats && (
                        <div className="mt-2 text-xs text-gray-600 grid grid-cols-4 gap-2">
                          <div>G: {stats.goals}</div>
                          <div>A: {stats.assists}</div>
                          <div>YC: {stats.yellow_cards}</div>
                          <div>RC: {stats.red_cards}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Away Team */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2" />
                {selectedMatch.away_team_name}
              </h3>
              <div className="space-y-2">
                {awayPlayers.map(player => {
                  const stats = playerStats[player.player_id];
                  return (
                    <div key={player.player_id} className={`p-3 rounded-lg border ${
                      stats?.is_playing ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-gray-900">{player.name}</div>
                          <div className="text-sm text-gray-500">{player.position}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-emerald-600">{stats?.total_points || 0} pts</div>
                          <div className="text-xs text-gray-500">{stats?.minutes_played || 0}'</div>
                        </div>
                      </div>
                      {stats && (
                        <div className="mt-2 text-xs text-gray-600 grid grid-cols-4 gap-2">
                          <div>G: {stats.goals}</div>
                          <div>A: {stats.assists}</div>
                          <div>YC: {stats.yellow_cards}</div>
                          <div>RC: {stats.red_cards}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Match Events */}
          {matchEvents.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Match Events
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {matchEvents.slice().reverse().map(event => (
                  <div key={event.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium text-gray-900">{event.minute}'</span>
                      <span className="text-gray-600">{event.description}</span>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      event.type === 'goal' ? 'bg-green-100 text-green-800' :
                      event.type === 'yellow_card' ? 'bg-yellow-100 text-yellow-800' :
                      event.type === 'red_card' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {event.type.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}