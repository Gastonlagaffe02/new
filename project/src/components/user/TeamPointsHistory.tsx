import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Calendar, Users, Target, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface GameweekPoints {
  id: string;
  gameweek: number;
  points: number;
  rank_in_league: number | null;
  created_at: string;
}

interface PlayerGameweekScore {
  player_name: string;
  position: string;
  team_name: string;
  minutes_played: number;
  goals: number;
  assists: number;
  clean_sheet: boolean;
  yellow_cards: number;
  red_cards: number;
  bonus_points: number;
  total_points: number;
  is_starter: boolean;
  is_captain: boolean;
  is_vice_captain: boolean;
}

interface GameweekDetail {
  gameweek: number;
  points: number;
  rank: number | null;
  players: PlayerGameweekScore[];
}

export default function TeamPointsHistory() {
  const { user } = useAuth();
  const [gameweekPoints, setGameweekPoints] = useState<GameweekPoints[]>([]);
  const [selectedGameweek, setSelectedGameweek] = useState<number | null>(null);
  const [gameweekDetail, setGameweekDetail] = useState<GameweekDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [fantasyTeamId, setFantasyTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchTeamPointsHistory();
    }
  }, [user]);

  useEffect(() => {
    if (selectedGameweek && fantasyTeamId) {
      fetchGameweekDetail(selectedGameweek);
    }
  }, [selectedGameweek, fantasyTeamId]);

  const fetchTeamPointsHistory = async () => {
    if (!user) return;

    try {
      // Get user's fantasy team
      const { data: teamData, error: teamError } = await supabase
        .from('fantasy_teams')
        .select('fantasy_team_id')
        .eq('user_id', user.id)
        .single();

      if (teamError) throw teamError;
      if (!teamData) return;

      setFantasyTeamId(teamData.fantasy_team_id);

      // Get gameweek points history
      const { data: pointsData, error: pointsError } = await supabase
        .from('fantasy_team_gameweek_points')
        .select('*')
        .eq('fantasy_team_id', teamData.fantasy_team_id)
        .order('gameweek', { ascending: false });

      if (pointsError) throw pointsError;
      setGameweekPoints(pointsData || []);

      // Auto-select most recent gameweek
      if (pointsData && pointsData.length > 0) {
        setSelectedGameweek(pointsData[0].gameweek);
      }
    } catch (error) {
      console.error('Error fetching team points history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGameweekDetail = async (gameweek: number) => {
    if (!fantasyTeamId) return;

    setDetailLoading(true);
    try {
      // Get gameweek points
      const gameweekData = gameweekPoints.find(gp => gp.gameweek === gameweek);
      if (!gameweekData) return;

      // Get player performances for this gameweek
      const { data: playerData, error } = await supabase
        .from('rosters')
        .select(`
          is_starter,
          is_captain,
          is_vice_captain,
          players:player_id (
            name,
            position,
            teams:team_id (
              name
            )
          ),
          gameweek_scores!inner (
            minutes_played,
            goals,
            assists,
            clean_sheet,
            yellow_cards,
            red_cards,
            bonus_points,
            total_points
          )
        `)
        .eq('fantasy_team_id', fantasyTeamId)
        .eq('gameweek_scores.gameweek', gameweek);

      if (error) throw error;

      const players: PlayerGameweekScore[] = playerData?.map(roster => {
        const score = roster.gameweek_scores[0];
        let finalPoints = score?.total_points || 0;
        
        // Apply captain multiplier
        if (roster.is_captain && finalPoints > 0) {
          finalPoints *= 2;
        }

        return {
          player_name: roster.players?.name || 'Unknown',
          position: roster.players?.position || 'Unknown',
          team_name: roster.players?.teams?.name || 'Unknown',
          minutes_played: score?.minutes_played || 0,
          goals: score?.goals || 0,
          assists: score?.assists || 0,
          clean_sheet: score?.clean_sheet || false,
          yellow_cards: score?.yellow_cards || 0,
          red_cards: score?.red_cards || 0,
          bonus_points: score?.bonus_points || 0,
          total_points: finalPoints,
          is_starter: roster.is_starter || false,
          is_captain: roster.is_captain || false,
          is_vice_captain: roster.is_vice_captain || false,
        };
      }) || [];

      setGameweekDetail({
        gameweek,
        points: gameweekData.points,
        rank: gameweekData.rank_in_league,
        players: players.sort((a, b) => {
          // Sort by: starters first, then by points descending
          if (a.is_starter !== b.is_starter) {
            return a.is_starter ? -1 : 1;
          }
          return b.total_points - a.total_points;
        }),
      });
    } catch (error) {
      console.error('Error fetching gameweek detail:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'GK': return 'bg-purple-100 text-purple-800';
      case 'DEF': return 'bg-blue-100 text-blue-800';
      case 'MID': return 'bg-emerald-100 text-emerald-800';
      case 'FWD': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTotalPoints = () => {
    return gameweekPoints.reduce((sum, gw) => sum + gw.points, 0);
  };

  const getAveragePoints = () => {
    if (gameweekPoints.length === 0) return 0;
    return Math.round((getTotalPoints() / gameweekPoints.length) * 10) / 10;
  };

  const getBestGameweek = () => {
    if (gameweekPoints.length === 0) return null;
    return gameweekPoints.reduce((best, current) => 
      current.points > best.points ? current : best
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (gameweekPoints.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Points History</h3>
        <p className="text-gray-500">Your gameweek points will appear here once gameweeks are finalized.</p>
      </div>
    );
  }

  const bestGameweek = getBestGameweek();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Points History</h1>
        <p className="text-gray-600">
          Track your fantasy team's performance across all gameweeks.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="bg-emerald-100 p-3 rounded-lg">
              <Trophy className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Points</p>
              <p className="text-2xl font-semibold text-gray-900">{getTotalPoints()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Points</p>
              <p className="text-2xl font-semibold text-gray-900">{getAveragePoints()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Gameweeks Played</p>
              <p className="text-2xl font-semibold text-gray-900">{gameweekPoints.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Award className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Best Gameweek</p>
              <p className="text-2xl font-semibold text-gray-900">
                {bestGameweek ? `${bestGameweek.points} pts` : '-'}
              </p>
              {bestGameweek && (
                <p className="text-xs text-gray-500">GW {bestGameweek.gameweek}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gameweek List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Gameweeks</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {gameweekPoints.map((gameweek) => (
                <button
                  key={gameweek.id}
                  onClick={() => setSelectedGameweek(gameweek.gameweek)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedGameweek === gameweek.gameweek
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">
                        Gameweek {gameweek.gameweek}
                      </div>
                      {gameweek.rank_in_league && (
                        <div className="text-sm text-gray-500">
                          Rank #{gameweek.rank_in_league}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-600">{gameweek.points} pts</div>
                      <div className="text-xs text-gray-500">
                        {new Date(gameweek.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Gameweek Detail */}
        <div className="lg:col-span-2">
          {gameweekDetail ? (
            <div className="space-y-6">
              {/* Gameweek Summary */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Gameweek {gameweekDetail.gameweek}
                  </h2>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-emerald-600">
                      {gameweekDetail.points} pts
                    </div>
                    {gameweekDetail.rank && (
                      <div className="text-sm text-gray-500">
                        League Rank #{gameweekDetail.rank}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Player Performances */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Player Performances</h3>
                
                {detailLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Starting XI */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Starting XI</h4>
                      <div className="space-y-2">
                        {gameweekDetail.players.filter(p => p.is_starter).map((player, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getPositionColor(player.position)}`}>
                                {player.position}
                              </span>
                              <div>
                                <div className="font-medium text-gray-900 flex items-center space-x-2">
                                  <span>{player.player_name}</span>
                                  {player.is_captain && (
                                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full font-bold">
                                      C
                                    </span>
                                  )}
                                  {player.is_vice_captain && (
                                    <span className="bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded-full font-bold">
                                      VC
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500">{player.team_name}</div>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="font-bold text-emerald-600 text-lg">{player.total_points}</div>
                              <div className="text-xs text-gray-500">
                                {player.minutes_played}' | G:{player.goals} A:{player.assists}
                                {player.yellow_cards > 0 && ` YC:${player.yellow_cards}`}
                                {player.red_cards > 0 && ` RC:${player.red_cards}`}
                                {player.bonus_points > 0 && ` B:${player.bonus_points}`}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bench */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Substitutes</h4>
                      <div className="space-y-2">
                        {gameweekDetail.players.filter(p => !p.is_starter).map((player, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg opacity-75">
                            <div className="flex items-center space-x-3">
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getPositionColor(player.position)}`}>
                                {player.position}
                              </span>
                              <div>
                                <div className="font-medium text-gray-900">{player.player_name}</div>
                                <div className="text-sm text-gray-500">{player.team_name}</div>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="font-bold text-gray-600">{player.total_points}</div>
                              <div className="text-xs text-gray-500">
                                {player.minutes_played}' | G:{player.goals} A:{player.assists}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Gameweek</h3>
              <p className="text-gray-500">Choose a gameweek from the list to see detailed player performances.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}