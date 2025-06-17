import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Target, Award, Clock, Users, Star, Trophy, Calendar, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Player, GameweekScore, RealMatch } from '../../types/database';

interface PlayerProfileModalProps {
  player: Player & { team_name?: string; team_jersey?: string };
  onClose: () => void;
}

interface PlayerStats {
  form: number;
  pointsPerMatch: number;
  totalBonus: number;
  ictIndex: number;
  ownership: number;
  rank: number;
}

export default function PlayerProfileModal({ player, onClose }: PlayerProfileModalProps) {
  const [gameweekScores, setGameweekScores] = useState<GameweekScore[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    form: 0,
    pointsPerMatch: 0,
    totalBonus: 0,
    ictIndex: 0,
    ownership: 0,
    rank: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlayerData();
  }, [player.player_id]);

  const fetchPlayerData = async () => {
    try {
      // Fetch gameweek scores
      const { data: scores, error: scoresError } = await supabase
        .from('gameweek_scores')
        .select('*')
        .eq('player_id', player.player_id)
        .order('gameweek', { ascending: false });

      if (scoresError) throw scoresError;
      setGameweekScores(scores || []);

      // Calculate player stats
      if (scores && scores.length > 0) {
        const recentForm = scores.slice(0, 5);
        const formPoints = recentForm.reduce((sum, score) => sum + (score.total_points || 0), 0);
        const form = recentForm.length > 0 ? formPoints / recentForm.length : 0;
        
        const totalPoints = scores.reduce((sum, score) => sum + (score.total_points || 0), 0);
        const pointsPerMatch = scores.length > 0 ? totalPoints / scores.length : 0;
        
        const totalBonus = scores.reduce((sum, score) => sum + (score.bonus_points || 0), 0);

        setPlayerStats({
          form: Math.round(form * 10) / 10,
          pointsPerMatch: Math.round(pointsPerMatch * 10) / 10,
          totalBonus,
          ictIndex: Math.floor(Math.random() * 200) + 50, // Mock ICT index
          ownership: Math.floor(Math.random() * 30) + 5, // Mock ownership %
          rank: Math.floor(Math.random() * 100) + 1 // Mock rank
        });
      }

    } catch (error) {
      console.error('Error fetching player data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'GK': return 'bg-purple-600 text-white';
      case 'DEF': return 'bg-blue-600 text-white';
      case 'MID': return 'bg-emerald-600 text-white';
      case 'FWD': return 'bg-orange-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  const getPositionName = (position: string) => {
    switch (position) {
      case 'GK': return 'Goalkeeper';
      case 'DEF': return 'Defender';
      case 'MID': return 'Midfielder';
      case 'FWD': return 'Forward';
      default: return position;
    }
  };

  const getResultColor = (points: number) => {
    if (points >= 8) return 'bg-green-500';
    if (points >= 4) return 'bg-yellow-500';
    if (points > 0) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header Section with Gradient Background */}
        <div className="relative bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          
          <div className="flex items-center space-x-6">
            {/* Player Image - Full Size */}
            <div className="w-48 h-64 rounded-lg overflow-hidden bg-white/20 flex-shrink-0">
              {player.image_url ? (
                <img
                  src={player.image_url}
                  alt={player.name}
                  className="w-full h-full object-cover object-top"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling!.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className={`w-full h-full bg-gray-300 flex items-center justify-center ${
                  player.image_url ? 'hidden' : 'flex'
                }`}
              >
                <Users className="h-12 w-12 text-gray-500" />
              </div>
            </div>

            {/* Player Info */}
            <div className="flex-1">
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-2 ${getPositionColor(player.position)}`}>
                {getPositionName(player.position)}
              </div>
              <h1 className="text-3xl font-bold mb-1">{player.name}</h1>
              <p className="text-xl opacity-90">{player.team_name}</p>
            </div>
          </div>
        </div>

        {/* Key Statistics Bar */}
        <div className="bg-gray-50 p-4 border-b">
          <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">£{player.price}m</div>
              <div className="text-xs text-gray-500">{playerStats.ownership}% owned</div>
              <div className="text-xs text-gray-400">Price</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{playerStats.form}</div>
              <div className="text-xs text-gray-400">Form</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{playerStats.pointsPerMatch}</div>
              <div className="text-xs text-gray-500">{player.games_played} matches</div>
              <div className="text-xs text-gray-400">Pts per Match</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{gameweekScores[0]?.total_points || 0}</div>
              <div className="text-xs text-gray-400">GW38 Points</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{player.total_points}</div>
              <div className="text-xs text-gray-500">#{playerStats.rank}</div>
              <div className="text-xs text-gray-400">Total Points</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{playerStats.totalBonus}</div>
              <div className="text-xs text-gray-400">Total Bonus</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{playerStats.ictIndex}</div>
              <div className="text-xs text-gray-500">#{playerStats.rank}</div>
              <div className="text-xs text-gray-400">ICT Index</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{playerStats.ownership}%</div>
              <div className="text-xs text-gray-500">#{playerStats.rank}</div>
              <div className="text-xs text-gray-400">TSB%</div>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="p-6">
          <div className="mb-6">
            {/* Recent Form */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Recent Form
              </h3>
              <div className="flex space-x-2">
                {gameweekScores.slice(0, 5).map((score, index) => (
                  <div key={score.score_id} className="text-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm ${getResultColor(score.total_points || 0)}`}>
                      {score.total_points || 0}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">GW{score.gameweek}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Season History */}
          <div className="max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">This Season</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">GW</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">OPP</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pts</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Min</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">G</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">A</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">CS</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">YC</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">RC</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bonus</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {gameweekScores.map((score) => (
                    <tr key={score.score_id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {score.gameweek}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        vs OPP
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          (score.total_points || 0) >= 8 ? 'bg-green-100 text-green-800' :
                          (score.total_points || 0) >= 4 ? 'bg-yellow-100 text-yellow-800' :
                          (score.total_points || 0) > 0 ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {score.total_points || 0}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {score.minutes_played || 0}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {score.goals || 0}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {score.assists || 0}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {score.clean_sheet ? '1' : '0'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {score.yellow_cards || 0}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {score.red_cards || 0}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {score.bonus_points || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}