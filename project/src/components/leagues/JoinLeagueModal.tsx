import React, { useState } from 'react';
import { X, Search, Users, DollarSign, Trophy, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { League } from '../../types/database';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface JoinLeagueModalProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function JoinLeagueModal({ onSuccess, onCancel }: JoinLeagueModalProps) {
  const { user } = useAuth();
  const [leagueId, setLeagueId] = useState('');
  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [searched, setSearched] = useState(false);

  const searchLeague = async () => {
    if (!leagueId.trim()) {
      toast.error('Please enter a league ID');
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const { data, error } = await supabase
        .from('leagues')
        .select(`
          *,
          users:creator_id (
            username
          )
        `)
        .eq('league_id', leagueId.trim())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast.error('League not found. Please check the ID and try again.');
          setLeague(null);
        } else {
          throw error;
        }
        return;
      }

      // Check if user is already in this league
      const { data: existingTeam, error: teamError } = await supabase
        .from('fantasy_teams')
        .select('fantasy_team_id')
        .eq('user_id', user?.id)
        .eq('league_id', leagueId.trim())
        .single();

      if (teamError && teamError.code !== 'PGRST116') {
        throw teamError;
      }

      if (existingTeam) {
        toast.error('You are already a member of this league');
        setLeague(null);
        return;
      }

      // Check if league is full
      if (data.current_participants >= data.max_participants) {
        toast.error('This league is full');
        setLeague(null);
        return;
      }

      // Check if user is the creator
      if (data.creator_id === user?.id) {
        toast.error('You cannot join your own league');
        setLeague(null);
        return;
      }

      setLeague(data);
    } catch (error) {
      console.error('Error searching league:', error);
      toast.error('Failed to search for league');
      setLeague(null);
    } finally {
      setLoading(false);
    }
  };

  const joinLeague = async () => {
    if (!league || !user) return;

    // Check if user has a fantasy team
    const { data: userFantasyTeam, error: teamCheckError } = await supabase
      .from('fantasy_teams')
      .select('fantasy_team_id')
      .eq('user_id', user.id)
      .is('league_id', null)
      .single();

    if (teamCheckError && teamCheckError.code !== 'PGRST116') {
      console.error('Error checking user team:', teamCheckError);
      toast.error('Failed to check your fantasy team');
      return;
    }

    if (!userFantasyTeam) {
      toast.error('You need to create a fantasy team first before joining a league');
      return;
    }

    setJoining(true);

    try {
      // Update the user's fantasy team to join this league
      const { error: updateError } = await supabase
        .from('fantasy_teams')
        .update({ league_id: league.league_id })
        .eq('fantasy_team_id', userFantasyTeam.fantasy_team_id);

      if (updateError) throw updateError;

      // Increment the league's current participants count
      const { error: leagueUpdateError } = await supabase
        .from('leagues')
        .update({ 
          current_participants: league.current_participants + 1,
          updated_at: new Date().toISOString()
        })
        .eq('league_id', league.league_id);

      if (leagueUpdateError) throw leagueUpdateError;

      toast.success(`Successfully joined "${league.name}"!`);
      onSuccess();
    } catch (error) {
      console.error('Error joining league:', error);
      toast.error('Failed to join league');
    } finally {
      setJoining(false);
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Join League</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              League ID
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={leagueId}
                onChange={(e) => setLeagueId(e.target.value)}
                placeholder="Enter league ID"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <button
                onClick={searchLeague}
                disabled={loading}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Ask the league creator for the league ID
            </p>
          </div>

          {/* League Details */}
          {searched && (
            <div className="border-t pt-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                </div>
              ) : league ? (
                <div className="space-y-4">
                  <div className="bg-emerald-50 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{league.name}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(league.status)}`}>
                        {league.status}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <div>Created by: <span className="font-medium">@{league.users?.username}</span></div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        {league.current_participants}/{league.max_participants} participants
                      </div>
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Entry Fee: ${league.entry_fee}
                      </div>
                      <div className="flex items-center">
                        <Trophy className="h-4 w-4 mr-2" />
                        Prize Pool: ${league.prize_pool}
                      </div>
                      {league.start_date && (
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          Starts: {new Date(league.start_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={joinLeague}
                    disabled={joining}
                    className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {joining ? 'Joining...' : 'Join This League'}
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-500">League not found or unavailable</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onCancel}
            className="bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}