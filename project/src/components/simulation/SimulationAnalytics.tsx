import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Target, Award, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AnalyticsData {
  totalMatches: number;
  totalGoals: number;
  totalAssists: number;
  totalCards: number;
  averageGoalsPerMatch: number;
  topScorer: { name: string; goals: number; team: string } | null;
  topAssister: { name: string; assists: number; team: string } | null;
  mostCards: { name: string; cards: number; team: string } | null;
  positionStats: {
    position: string;
    avgPoints: number;
    totalPlayers: number;
    topPerformer: string;
  }[];
  gameweekTrends: {
    gameweek: number;
    avgPoints: number;
    totalGoals: number;
    totalCards: number;
  }[];
}

export default function SimulationAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGameweek, setSelectedGameweek] = useState<number | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedGameweek]);

  const fetchAnalytics = async () => {
    try {
      // Fetch basic match statistics
      let matchQuery = supabase
        .from('real_matches')
        .select('*')
        .eq('status', 'completed');

      if (selectedGameweek) {
        matchQuery = matchQuery.eq('gameweek', selectedGameweek);
      }

      const { data: matches } = await matchQuery;

      // Fetch player performance data
      let scoresQuery = supabase
        .from('gameweek_scores')
        .select(`
          *,
          players:player_id (
            name,
            position,
            teams:team_id (
              name
            )
          )
        `);

      if (selectedGameweek) {
        scoresQuery = scoresQuery.eq('gameweek', selectedGameweek);
      }

      const { data: scores } = await scoresQuery;

      if (!matches || !scores) {
        setAnalytics(null);
        return;
      }

      // Calculate basic statistics
      const totalMatches = matches.length;
      const totalGoals = scores.reduce((sum, score) => sum + score.goals, 0);
      const totalAssists = scores.reduce((sum, score) => sum + score.assists, 0);
      const totalCards = scores.reduce((sum, score) => sum + score.yellow_cards + score.red_cards, 0);
      const averageGoalsPerMatch = totalMatches > 0 ? totalGoals / totalMatches : 0;

      // Find top performers
      const topScorer = scores.reduce((top, score) => {
        if (!top || score.goals > top.goals) {
          return {
            name: score.players?.name || 'Unknown',
            goals: score.goals,
            team: score.players?.teams?.name || 'Unknown'
          };
        }
        return top;
      }, null as { name: string; goals: number; team: string } | null);

      const topAssister = scores.reduce((top, score) => {
        if (!top || score.assists > top.assists) {
          return {
            name: score.players?.name || 'Unknown',
            assists: score.assists,
            team: score.players?.teams?.name || 'Unknown'
          };
        }
        return top;
      }, null as { name: string; assists: number; team: string } | null);

      const mostCards = scores.reduce((top, score) => {
        const cards = score.yellow_cards + score.red_cards;
        if (!top || cards > top.cards) {
          return {
            name: score.players?.name || 'Unknown',
            cards: cards,
            team: score.players?.teams?.name || 'Unknown'
          };
        }
        return top;
      }, null as { name: string; cards: number; team: string } | null);

      // Calculate position statistics
      const positionGroups = scores.reduce((groups, score) => {
        const position = score.players?.position || 'Unknown';
        if (!groups[position]) {
          groups[position] = [];
        }
        groups[position].push(score);
        return groups;
      }, {} as Record<string, any[]>);

      const positionStats = Object.entries(positionGroups).map(([position, playerScores]) => {
        const avgPoints = playerScores.reduce((sum, score) => sum + score.total_points, 0) / playerScores.length;
        const topPerformer = playerScores.reduce((top, score) => {
          return !top || score.total_points > top.total_points ? score : top;
        }, null);

        return {
          position,
          avgPoints: Math.round(avgPoints * 10) / 10,
          totalPlayers: playerScores.length,
          topPerformer: topPerformer?.players?.name || 'Unknown'
        };
      });

      // Calculate gameweek trends (if not filtering by specific gameweek)
      let gameweekTrends: AnalyticsData['gameweekTrends'] = [];
      if (!selectedGameweek) {
        const { data: allScores } = await supabase
          .from('gameweek_scores')
          .select('gameweek, total_points, goals, yellow_cards, red_cards');

        if (allScores) {
          const gameweekGroups = allScores.reduce((groups, score) => {
            if (!groups[score.gameweek]) {
              groups[score.gameweek] = [];
            }
            groups[score.gameweek].push(score);
            return groups;
          }, {} as Record<number, any[]>);

          gameweekTrends = Object.entries(gameweekGroups).map(([gw, scores]) => ({
            gameweek: parseInt(gw),
            avgPoints: Math.round((scores.reduce((sum, s) => sum + s.total_points, 0) / scores.length) * 10) / 10,
            totalGoals: scores.reduce((sum, s) => sum + s.goals, 0),
            totalCards: scores.reduce((sum, s) => sum + s.yellow_cards + s.red_cards, 0)
          })).sort((a, b) => a.gameweek - b.gameweek);
        }
      }

      setAnalytics({
        totalMatches,
        totalGoals,
        totalAssists,
        totalCards,
        averageGoalsPerMatch: Math.round(averageGoalsPerMatch * 10) / 10,
        topScorer,
        topAssister,
        mostCards,
        positionStats,
        gameweekTrends
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGameweeks = async () => {
    const { data } = await supabase
      .from('gameweek_scores')
      .select('gameweek')
      .order('gameweek', { ascending: false });
    
    return [...new Set(data?.map(d => d.gameweek) || [])];
  };

  const [gameweeks, setGameweeks] = useState<number[]>([]);

  useEffect(() => {
    getGameweeks().then(setGameweeks);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-500">Complete some match simulations to see analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Simulation Analytics</h1>
            <p className="text-gray-600">
              Comprehensive statistics and insights from match simulations.
            </p>
          </div>
          <div>
            <select
              value={selectedGameweek || ''}
              onChange={(e) => setSelectedGameweek(e.target.value ? parseInt(e.target.value) : null)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">All Gameweeks</option>
              {gameweeks.map(gw => (
                <option key={gw} value={gw}>
                  Gameweek {gw}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Matches</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.totalMatches}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="bg-emerald-100 p-3 rounded-lg">
              <Target className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Goals</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.totalGoals}</p>
              <p className="text-xs text-gray-500">{analytics.averageGoalsPerMatch} per match</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Assists</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.totalAssists}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Cards</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.totalCards}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Award className="h-5 w-5 mr-2 text-yellow-500" />
            Top Scorer
          </h3>
          {analytics.topScorer ? (
            <div>
              <div className="text-xl font-bold text-gray-900">{analytics.topScorer.name}</div>
              <div className="text-sm text-gray-500">{analytics.topScorer.team}</div>
              <div className="text-2xl font-bold text-emerald-600 mt-2">{analytics.topScorer.goals} goals</div>
            </div>
          ) : (
            <div className="text-gray-500">No data available</div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-purple-500" />
            Top Assister
          </h3>
          {analytics.topAssister ? (
            <div>
              <div className="text-xl font-bold text-gray-900">{analytics.topAssister.name}</div>
              <div className="text-sm text-gray-500">{analytics.topAssister.team}</div>
              <div className="text-2xl font-bold text-purple-600 mt-2">{analytics.topAssister.assists} assists</div>
            </div>
          ) : (
            <div className="text-gray-500">No data available</div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
            Most Cards
          </h3>
          {analytics.mostCards && analytics.mostCards.cards > 0 ? (
            <div>
              <div className="text-xl font-bold text-gray-900">{analytics.mostCards.name}</div>
              <div className="text-sm text-gray-500">{analytics.mostCards.team}</div>
              <div className="text-2xl font-bold text-red-600 mt-2">{analytics.mostCards.cards} cards</div>
            </div>
          ) : (
            <div className="text-gray-500">No cards issued</div>
          )}
        </div>
      </div>

      {/* Position Statistics */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Performance by Position
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {analytics.positionStats.map(stat => (
            <div key={stat.position} className="border border-gray-200 rounded-lg p-4">
              <div className="text-center">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-2 ${
                  stat.position === 'GK' ? 'bg-purple-100 text-purple-800' :
                  stat.position === 'DEF' ? 'bg-blue-100 text-blue-800' :
                  stat.position === 'MID' ? 'bg-emerald-100 text-emerald-800' :
                  'bg-orange-100 text-orange-800'
                }`}>
                  {stat.position}
                </div>
                <div className="text-2xl font-bold text-gray-900">{stat.avgPoints}</div>
                <div className="text-sm text-gray-500">avg points</div>
                <div className="text-xs text-gray-400 mt-2">
                  {stat.totalPlayers} players
                </div>
                <div className="text-xs font-medium text-gray-600 mt-1">
                  Top: {stat.topPerformer}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gameweek Trends */}
      {!selectedGameweek && analytics.gameweekTrends.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Gameweek Trends
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gameweek
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Goals
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Cards
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.gameweekTrends.map(trend => (
                  <tr key={trend.gameweek} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        GW {trend.gameweek}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {trend.avgPoints}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {trend.totalGoals}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {trend.totalCards}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}