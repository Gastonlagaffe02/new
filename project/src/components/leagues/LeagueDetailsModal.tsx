import React, { useState, useEffect } from 'react';
import { X, Users, DollarSign, Trophy, Calendar, Crown, Medal, Award } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { League } from '../../types/database';

interface LeagueDetailsModalProps {
  league: League;
  onClose: () => void;
}

interface LeagueParticipant {
  fantasy_team_id: string;
  team_name: string;
  total_points: number;
  rank: number;
  user: {
    username: string;
  };
}

export default function LeagueDetailsModal({ league, onClose }: LeagueDetailsModalProps) {
  const [participants, setParticipants] = useState<LeagueParticipant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchParticipants();
  }, [league.league_id]);

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('fantasy_teams')
        .select(`
          fantasy_team_id,
          team_name,
          total_points,
          rank,
          users:user_id (
            username
          )
        `)
        .eq('league_id', league.league_id)
        .order('rank', { ascending: true });

      if (error) throw error;
      setParticipants(data || []);
    } catch (error) {
      console.error('Error fetching participants:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Award className="h-5 w-5 text-orange-500" />;
      default: return <span className="text-gray-500 font-medium">#{rank}</span>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">League Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* League Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{league.name}</h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(league.status)}`}>
                {league.status}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center text-gray-600">
                <Users className="h-4 w-4 mr-2" />
                {league.current_participants}/{league.max_participants} participants
              </div>
              <div className="flex items-center text-gray-600">
                <DollarSign className="h-4 w-4 mr-2" />
                Entry Fee: ${league.entry_fee}
              </div>
              <div className="flex items-center text-gray-600">
                <Trophy className="h-4 w-4 mr-2" />
                Prize Pool: ${league.prize_pool}
              </div>
              <div className="text-gray-600">
                Gameweek: {league.gameweek_current}
              </div>
              {league.start_date && (
                <div className="flex items-center text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  Start: {new Date(league.start_date).toLocaleDateString()}
                </div>
              )}
              {league.end_date && (
                <div className="flex items-center text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  End: {new Date(league.end_date).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          {/* Scoring System */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Scoring System</h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              {league.scoring_system && typeof league.scoring_system === 'object' && (
                <>
                  <div>Goals: +{league.scoring_system.goals || 5} pts</div>
                  <div>Assists: +{league.scoring_system.assists || 3} pts</div>
                  <div>Clean Sheet: +{league.scoring_system.clean_sheet || 4} pts</div>
                  <div>Yellow Card: {league.scoring_system.yellow_card || -1} pts</div>
                  <div>Red Card: {league.scoring_system.red_card || -3} pts</div>
                </>
              )}
            </div>
          </div>

          {/* Leaderboard */}
          <div>
            <h4 className="font-medium text-gray-900 mb-4">Leaderboard</h4>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
              </div>
            ) : participants.length > 0 ? (
              <div className="space-y-2">
                {participants.map((participant) => (
                  <div key={participant.fantasy_team_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8">
                        {getRankIcon(participant.rank)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{participant.team_name}</div>
                        <div className="text-sm text-gray-500">@{participant.user?.username}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{participant.total_points} pts</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No participants yet
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}