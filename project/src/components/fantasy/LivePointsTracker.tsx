import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Target, Award, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useGameweek } from '../../hooks/useGameweek';

interface PlayerPoints {
  player_id: string;
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

interface LivePointsTrackerProps {
  fantasyTeamId?: string;
}

export default function LivePointsTracker({ fantasyTeamId }: LivePointsTrackerProps) {
  const { user } = useAuth();
  const { gameweekStatus } = useGameweek();
  const [playerPoints, setPlayerPoints] = useState<PlayerPoints[]>([]);
  const [teamPoints, setTeamPoints] = useState({
    total: 0,
    gameweek: 0,
    bench: 0,
    captain: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (fantasyTeamId) {
      fetchLivePoints();
      
      // Update every 30 seconds during active gameweek
      let interval: NodeJS.Timeout;
      if (gameweekStatus.isGameweekActive) {
        interval = setInterval(fetchLivePoints, 30000);
      }
      
      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [fantasyTeamId, gameweekStatus.isGameweekActive]);

  const fetchLivePoints = async () => {
    if (!fantasyTeamId) return;

    try {
      const currentGameweek = gameweekStatus.current?.gameweek_number || 1;

      // Fetch roster with current gameweek scores
      const { data: rosterData, error } = await supabase
        .from('rosters')
        .select(`
          *,
          player:player_id (
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
        .eq('gameweek_scores.gameweek', currentGameweek);

      if (error) throw error;

      const playersWithPoints: PlayerPoints[] = rosterData?.map(roster => {
        const score = roster.gameweek_scores[0] || {
          minutes_played: 0,
          goals: 0,
          assists: 0,
          clean_sheet: false,
          yellow_cards: 0,
          red_cards: 0,
          bonus_points: 0,
          total_points: 0,
        };

        let finalPoints = score.total_points;
        
        // Apply captain multiplier
        if (roster.is_captain) {
          finalPoints *= 2;
        }

        return {
          player_id: roster.player_id,
          player_name: roster.player?.name || 'Unknown',
          position: roster.player?.position || 'Unknown',
          team_name: roster.player?.teams?.name || 'Unknown',
          minutes_played: score.minutes_played,
          goals: score.goals,
          assists: score.assists,
          clean_sheet: score.clean_sheet,
          yellow_cards: score.yellow_cards,
          red_cards: score.red_cards,
          bonus_points: score.bonus_points,
          total_points: finalPoints,
          is_starter: roster.is_starter,
          is_captain: roster.is_captain,
          is_vice_captain: roster.is_vice_captain,
        };
      }) || [];

      setPlayerPoints(playersWithPoints);

      // Calculate team totals
      const starters = playersWithPoints.filter(p => p.is_starter);
      const bench = playersWithPoints.filter(p => !p.is_starter);
      const captain = playersWithPoints.find(p => p.is_captain);

      const starterPoints = starters.reduce((sum, p) => sum + p.total_points, 0);
      const benchPoints = bench.reduce((sum, p) => sum + p.total_points, 0);
      const captainBonus = captain ? captain.total_points / 2 : 0; // Half because it's already doubled

      setTeamPoints({
        total: starterPoints,
        gameweek: starterPoints,
        bench: benchPoints,
        captain: captainBonus,
      });

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching live points:', error);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const starters = playerPoints.filter(p => p.is_starter);
  const bench = playerPoints.filter(p => !p.is_starter);

  return (
    <div className="space-y-6">
      {/* Points Summary */}
      <div className="bg-gradient-to-r from-emerald-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold">Live Points</h2>
            <p className="text-emerald-100">
              {gameweekStatus.current?.name || 'Current Gameweek'}
            </p>
          </div>
          <button
            onClick={fetchLivePoints}
            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl">
            <div className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              <div>
                <p className="text-sm text-emerald-100">Total Points</p>
                <p className="text-2xl font-bold">{teamPoints.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl">
            <div className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              <div>
                <p className="text-sm text-emerald-100">Bench Points</p>
                <p className="text-2xl font-bold">{teamPoints.bench}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl">
            <div className="flex items-center">
              <Award className="h-5 w-5 mr-2" />
              <div>
                <p className="text-sm text-emerald-100">Captain Bonus</p>
                <p className="text-2xl font-bold">+{teamPoints.captain}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl">
            <div className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              <div>
                <p className="text-sm text-emerald-100">Last Updated</p>
                <p className="text-sm font-medium">
                  {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Starting XI */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Starting XI
        </h3>
        <div className="space-y-3">
          {starters.map(player => (
            <div key={player.player_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bench */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Substitutes</h3>
        <div className="space-y-3">
          {bench.map(player => (
            <div key={player.player_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg opacity-75">
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

      {gameweekStatus.isGameweekActive && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center space-x-2 text-blue-800">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">
              Points are updating live during the gameweek. Refresh to see the latest scores.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}