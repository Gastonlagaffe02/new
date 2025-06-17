import React, { useState, useEffect } from 'react';
import { Calendar, Users, Trophy, Target, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface MatchResult {
  match_id: string;
  gameweek: number;
  home_team_name: string;
  away_team_name: string;
  home_score: number;
  away_score: number;
  match_date: string;
  total_goals: number;
  total_assists: number;
  total_cards: number;
}

interface PlayerPerformance {
  player_id: string;
  player_name: string;
  team_name: string;
  position: string;
  total_points: number;
  goals: number;
  assists: number;
  minutes_played: number;
  yellow_cards: number;
  red_cards: number;
}

export default function SimulationHistory() {
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [topPerformers, setTopPerformers] = useState<PlayerPerformance[]>([]);
  const [selectedGameweek, setSelectedGameweek] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatchHistory();
    fetchTopPerformers();
  }, [selectedGameweek]);

  const fetchMatchHistory = async () => {
    try {
      let query = supabase
        .from('real_matches')
        .select(`
          match_id,
          gameweek,
          home_score,
          away_score,
          match_date,
          home_team:home_team_id (
            name
          ),
          away_team:away_team_id (
            name
          )
        `)
        .eq('status', 'completed')
        .order('match_date', { ascending: false });

      if (selectedGameweek) {
        query = query.eq('gameweek', selectedGameweek);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get match statistics
      const matchesWithStats = await Promise.all(
        (data || []).map(async (match) => {
          const { data: scores } = await supabase
            .from('gameweek_scores')
            .select('goals, assists, yellow_cards, red_cards')
            .eq('gameweek', match.gameweek);

          const totalGoals = scores?.reduce((sum, score) => sum + score.goals, 0) || 0;
          const totalAssists = scores?.reduce((sum, score) => sum + score.assists, 0) || 0;
          const totalCards = scores?.reduce((sum, score) => sum + score.yellow_cards + score.red_cards, 0) || 0;

          return {
            match_id: match.match_id,
            gameweek: match.gameweek,
            home_team_name: match.home_team?.name || 'TBD',
            away_team_name: match.away_team?.name || 'TBD',
            home_score: match.home_score || 0,
            away_score: match.away_score || 0,
            match_date: match.match_date,
            total_goals: totalGoals,
            total_assists: totalAssists,
            total_cards: totalCards,
          };
        })
      );

      setMatchResults(matchesWithStats);
    } catch (error) {
      console.error('Error fetching match history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopPerformers = async () => {
    try {
      let query = supabase
        .from('gameweek_scores')
        .select(`
          player_id,
          total_points,
          goals,
          assists,
          minutes_played,
          yellow_cards,
          red_cards,
          gameweek,
          players:player_id (
            name,
            position,
            teams:team_id (
              name
            )
          )
        `)
        .order('total_points', { ascending: false })
        .limit(10);

      if (selectedGameweek) {
        query = query.eq('gameweek', selectedGameweek);
      }

      const { data, error } = await query;

      if (error) throw error;

      const performers = data?.map(score => ({
        player_id: score.player_id,
        player_name: score.players?.name || 'Unknown',
        team_name: score.players?.teams?.name || 'Unknown',
        position: score.players?.position || 'Unknown',
        total_points: score.total_points,
        goals: score.goals,
        assists: score.assists,
        minutes_played: score.minutes_played,
        yellow_cards: score.yellow_cards,
        red_cards: score.red_cards,
      })) || [];

      setTopPerformers(performers);
    } catch (error) {
      console.error('Error fetching top performers:', error);
    }
  };

  const getGameweeks = () => {
    const gameweeks = [...new Set(matchResults.map(match => match.gameweek))].sort((a, b) => b - a);
    return gameweeks;
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Simulation History</h1>
            <p className="text-gray-600">
              View completed match simulations and player performances.
            </p>
          </div>
          <div>
            <select
              value={selectedGameweek || ''}
              onChange={(e) => setSelectedGameweek(e.target.value ? parseInt(e.target.value) : null)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">All Gameweeks</option>
              {getGameweeks().map(gw => (
                <option key={gw} value={gw}>
                  Gameweek {gw}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Match Results */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Trophy className="h-5 w-5 mr-2" />
          Match Results
        </h2>
        {matchResults.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No completed matches found
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matchResults.map(match => (
              <div key={match.match_id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-emerald-600">GW {match.gameweek}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(match.match_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-center mb-3">
                  <div className="font-semibold text-gray-900">
                    {match.home_team_name} {match.home_score} - {match.away_score} {match.away_team_name}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                  <div className="text-center">
                    <Target className="h-3 w-3 mx-auto mb-1" />
                    {match.total_goals} Goals
                  </div>
                  <div className="text-center">
                    <Users className="h-3 w-3 mx-auto mb-1" />
                    {match.total_assists} Assists
                  </div>
                  <div className="text-center">
                    <Calendar className="h-3 w-3 mx-auto mb-1" />
                    {match.total_cards} Cards
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Performers */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
          Top Performers
          {selectedGameweek && <span className="ml-2 text-sm text-gray-500">(Gameweek {selectedGameweek})</span>}
        </h2>
        {topPerformers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No player performances found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stats
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Minutes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topPerformers.map((performer, index) => (
                  <tr key={performer.player_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {index < 3 ? (
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                            index === 0 ? 'bg-yellow-500' :
                            index === 1 ? 'bg-gray-400' :
                            'bg-orange-500'
                          }`}>
                            {index + 1}
                          </div>
                        ) : (
                          <span className="text-gray-500 font-medium">{index + 1}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{performer.player_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{performer.team_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        performer.position === 'GK' ? 'bg-purple-100 text-purple-800' :
                        performer.position === 'DEF' ? 'bg-blue-100 text-blue-800' :
                        performer.position === 'MID' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {performer.position}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-emerald-600">{performer.total_points}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-gray-600">
                        G: {performer.goals} | A: {performer.assists}
                        {(performer.yellow_cards > 0 || performer.red_cards > 0) && (
                          <span className="ml-2">
                            YC: {performer.yellow_cards} | RC: {performer.red_cards}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-3 w-3 mr-1" />
                        {performer.minutes_played}'
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}