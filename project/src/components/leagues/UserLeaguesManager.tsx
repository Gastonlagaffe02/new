import React, { useState, useEffect } from 'react';
import { Plus, Search, Users, DollarSign, Trophy, Calendar, LogIn, Eye, Settings, Copy, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { League } from '../../types/database';
import { useAuth } from '../../contexts/AuthContext';
import UserLeagueForm from './UserLeagueForm';
import JoinLeagueModal from './JoinLeagueModal';
import LeagueDetailsModal from './LeagueDetailsModal';
import toast from 'react-hot-toast';

export default function UserLeaguesManager() {
  const { user } = useAuth();
  const [myLeagues, setMyLeagues] = useState<League[]>([]);
  const [joinedLeagues, setJoinedLeagues] = useState<(League & { creator_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'my-leagues' | 'joined-leagues'>('my-leagues');
  const [copiedLeagueId, setCopiedLeagueId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchMyLeagues();
      fetchJoinedLeagues();
    }
  }, [user]);

  const fetchMyLeagues = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('leagues')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyLeagues(data || []);
    } catch (error) {
      console.error('Error fetching my leagues:', error);
      toast.error('Failed to fetch your leagues');
    }
  };

  const fetchJoinedLeagues = async () => {
    if (!user) return;

    try {
      // First get the user's fantasy teams to find which leagues they're in
      const { data: fantasyTeams, error: teamsError } = await supabase
        .from('fantasy_teams')
        .select('league_id')
        .eq('user_id', user.id)
        .not('league_id', 'is', null);

      if (teamsError) throw teamsError;

      if (fantasyTeams && fantasyTeams.length > 0) {
        const leagueIds = fantasyTeams.map(team => team.league_id).filter(Boolean);
        
        const { data: leagues, error: leaguesError } = await supabase
          .from('leagues')
          .select(`
            *,
            users:creator_id (
              username
            )
          `)
          .in('league_id', leagueIds)
          .neq('creator_id', user.id) // Exclude leagues created by the user
          .order('created_at', { ascending: false });

        if (leaguesError) throw leaguesError;

        const leaguesWithCreatorNames = leagues?.map(league => ({
          ...league,
          creator_name: league.users?.username
        })) || [];

        setJoinedLeagues(leaguesWithCreatorNames);
      } else {
        setJoinedLeagues([]);
      }
    } catch (error) {
      console.error('Error fetching joined leagues:', error);
      toast.error('Failed to fetch joined leagues');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    setEditingLeague(null);
    fetchMyLeagues();
  };

  const handleJoinSuccess = () => {
    setShowJoinModal(false);
    fetchJoinedLeagues();
  };

  const copyLeagueId = async (leagueId: string) => {
    try {
      await navigator.clipboard.writeText(leagueId);
      setCopiedLeagueId(leagueId);
      toast.success('League ID copied to clipboard!');
      setTimeout(() => setCopiedLeagueId(null), 2000);
    } catch (error) {
      toast.error('Failed to copy league ID');
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

  const filteredMyLeagues = myLeagues.filter(league =>
    league.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredJoinedLeagues = joinedLeagues.filter(league =>
    league.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    league.creator_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Leagues</h1>
        <p className="text-gray-600">
          Create your own leagues or join existing ones to compete with other players.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search leagues..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setShowJoinModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <LogIn className="h-4 w-4 mr-2" />
            Join League
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create League
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('my-leagues')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'my-leagues'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Leagues ({myLeagues.length})
            </button>
            <button
              onClick={() => setActiveTab('joined-leagues')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'joined-leagues'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Joined Leagues ({joinedLeagues.length})
            </button>
          </nav>
        </div>

        {/* My Leagues Tab */}
        {activeTab === 'my-leagues' && (
          <div className="p-6">
            {filteredMyLeagues.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No leagues created yet</h3>
                <p className="text-gray-500 mb-4">Create your first league to start competing with friends!</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Create Your First League
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMyLeagues.map((league) => (
                  <div key={league.league_id} className="bg-gray-50 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{league.name}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(league.status)}`}>
                        {league.status}
                      </span>
                    </div>
                    
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-2" />
                        {league.current_participants}/{league.max_participants} participants
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Entry Fee: ${league.entry_fee}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Trophy className="h-4 w-4 mr-2" />
                        Prize Pool: ${league.prize_pool}
                      </div>
                      {league.start_date && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          Starts: {new Date(league.start_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs text-gray-500">League ID:</span>
                      <button
                        onClick={() => copyLeagueId(league.league_id)}
                        className="flex items-center text-xs text-emerald-600 hover:text-emerald-700 transition-colors"
                      >
                        {copiedLeagueId === league.league_id ? (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" />
                            Copy ID
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedLeague(league);
                          setShowDetailsModal(true);
                        }}
                        className="flex-1 bg-emerald-100 text-emerald-700 py-2 px-3 rounded-lg hover:bg-emerald-200 transition-colors text-sm flex items-center justify-center"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>
                      <button
                        onClick={() => {
                          setEditingLeague(league);
                          setShowCreateForm(true);
                        }}
                        className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center justify-center"
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Joined Leagues Tab */}
        {activeTab === 'joined-leagues' && (
          <div className="p-6">
            {filteredJoinedLeagues.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No leagues joined yet</h3>
                <p className="text-gray-500 mb-4">Join a league using its ID to start competing!</p>
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Join Your First League
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredJoinedLeagues.map((league) => (
                  <div key={league.league_id} className="bg-gray-50 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{league.name}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(league.status)}`}>
                        {league.status}
                      </span>
                    </div>
                    
                    <div className="space-y-3 mb-4">
                      <div className="text-sm text-gray-600">
                        Created by: <span className="font-medium">@{league.creator_name}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-2" />
                        {league.current_participants}/{league.max_participants} participants
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Entry Fee: ${league.entry_fee}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Trophy className="h-4 w-4 mr-2" />
                        Prize Pool: ${league.prize_pool}
                      </div>
                      {league.start_date && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          Starts: {new Date(league.start_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setSelectedLeague(league);
                        setShowDetailsModal(true);
                      }}
                      className="w-full bg-emerald-100 text-emerald-700 py-2 px-3 rounded-lg hover:bg-emerald-200 transition-colors text-sm flex items-center justify-center"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateForm && (
        <UserLeagueForm
          league={editingLeague}
          onSuccess={handleCreateSuccess}
          onCancel={() => {
            setShowCreateForm(false);
            setEditingLeague(null);
          }}
        />
      )}

      {showJoinModal && (
        <JoinLeagueModal
          onSuccess={handleJoinSuccess}
          onCancel={() => setShowJoinModal(false)}
        />
      )}

      {showDetailsModal && selectedLeague && (
        <LeagueDetailsModal
          league={selectedLeague}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedLeague(null);
          }}
        />
      )}
    </div>
  );
}