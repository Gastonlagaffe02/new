import React, { useState, useEffect } from 'react';
import { Users, DollarSign, Trophy, Calendar, Edit, Save, X, Plus, Minus, Crown, Star, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Player, Team, FantasyTeam, Roster } from '../../types/database';
import { useAuth } from '../../contexts/AuthContext';
import { useGameweek } from '../../hooks/useGameweek';
import { useTransfers } from '../../hooks/useTransfers';
import TeamCreation from './TeamCreation';
import PlayerProfileModal from './PlayerProfileModal';
import GameweekStatus from './GameweekStatus';
import TransferStatus from './TransferStatus';
import LivePointsTracker from './LivePointsTracker';
import toast from 'react-hot-toast';

interface PlayerWithTeam extends Player {
  team_name?: string;
  team_jersey?: string;
}

interface RosterPlayer extends Roster {
  player: PlayerWithTeam;
}

export default function MyTeam() {
  const { user } = useAuth();
  const { gameweekStatus } = useGameweek();
  const [fantasyTeam, setFantasyTeam] = useState<FantasyTeam | null>(null);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [availablePlayers, setAvailablePlayers] = useState<PlayerWithTeam[]>([]);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<string>('');
  const [replacingRosterId, setReplacingRosterId] = useState<string | null>(null);
  const [selectedPlayerForProfile, setSelectedPlayerForProfile] = useState<PlayerWithTeam | null>(null);
  const [showPlayerProfile, setShowPlayerProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<'team' | 'points'>('team');

  const { transferData, makeTransfer } = useTransfers(fantasyTeam?.fantasy_team_id);

  useEffect(() => {
    if (user) {
      fetchFantasyTeam();
    }
  }, [user]);

  const fetchFantasyTeam = async () => {
    if (!user) return;

    try {
      // First check if user has a fantasy team
      const { data: teamData, error: teamError } = await supabase
        .from('fantasy_teams')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (teamError) {
        if (teamError.code === 'PGRST116') {
          // No team found - user needs to create one
          setFantasyTeam(null);
          setLoading(false);
          return;
        }
        throw teamError;
      }

      setFantasyTeam(teamData);

      // Fetch roster if team exists
      if (teamData) {
        await fetchRoster(teamData.fantasy_team_id);
      }
    } catch (error) {
      console.error('Error fetching fantasy team:', error);
      toast.error('Failed to fetch your team');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoster = async (fantasyTeamId: string) => {
    try {
      const { data, error } = await supabase
        .from('rosters')
        .select(`
          *,
          player:player_id (
            *,
            teams:team_id (
              name,
              jersey
            )
          )
        `)
        .eq('fantasy_team_id', fantasyTeamId)
        .order('squad_position');

      if (error) throw error;

      const rosterWithTeamNames = data?.map(rosterItem => ({
        ...rosterItem,
        player: {
          ...rosterItem.player,
          team_name: rosterItem.player?.teams?.name,
          team_jersey: rosterItem.player?.teams?.jersey
        }
      })) || [];

      setRoster(rosterWithTeamNames);
    } catch (error) {
      console.error('Error fetching roster:', error);
      toast.error('Failed to fetch roster');
    }
  };

  const fetchAvailablePlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select(`
          *,
          teams:team_id (
            name,
            jersey
          )
        `)
        .order('name');

      if (error) throw error;

      const playersWithTeamNames = data?.map(player => ({
        ...player,
        team_name: player.teams?.name,
        team_jersey: player.teams?.jersey
      })) || [];

      setAvailablePlayers(playersWithTeamNames);
    } catch (error) {
      console.error('Error fetching players:', error);
      toast.error('Failed to fetch players');
    }
  };

  const getPlayersByPosition = (position: string, isStarter: boolean) => {
    return roster.filter(r => 
      r.player?.position === position && 
      r.is_starter === isStarter
    );
  };

  const getFormationCounts = () => {
    const starters = roster.filter(r => r.is_starter);
    return {
      defenders: starters.filter(r => r.player?.position === 'DEF').length,
      midfielders: starters.filter(r => r.player?.position === 'MID').length,
      forwards: starters.filter(r => r.player?.position === 'FWD').length,
    };
  };

  const calculateBudgetAfterTransfer = (outgoingPlayer: PlayerWithTeam, incomingPlayer: PlayerWithTeam) => {
    const currentBudget = fantasyTeam?.budget_remaining || 0;
    const priceDifference = incomingPlayer.price - outgoingPlayer.price;
    return currentBudget - priceDifference;
  };

  const handlePlayerReplace = async (rosterId: string, newPlayerId: string) => {
    if (!rosterId || !newPlayerId) {
      toast.error('Invalid player selection');
      return;
    }

    const outgoingPlayer = roster.find(r => r.roster_id === rosterId)?.player;
    if (!outgoingPlayer) {
      toast.error('Player not found');
      return;
    }

    const success = await makeTransfer(outgoingPlayer.player_id, newPlayerId, rosterId);
    
    if (success) {
      // Refresh team data
      if (fantasyTeam) {
        await fetchFantasyTeam();
        await fetchRoster(fantasyTeam.fantasy_team_id);
      }
      setShowPlayerModal(false);
      setReplacingRosterId(null);
    }
  };

  const setCaptain = async (rosterId: string) => {
    try {
      // Remove captain from all players
      await supabase
        .from('rosters')
        .update({ is_captain: false })
        .eq('fantasy_team_id', fantasyTeam?.fantasy_team_id);

      // Set new captain
      const { error } = await supabase
        .from('rosters')
        .update({ is_captain: true })
        .eq('roster_id', rosterId);

      if (error) throw error;

      toast.success('Captain updated');
      if (fantasyTeam) {
        await fetchRoster(fantasyTeam.fantasy_team_id);
      }
    } catch (error) {
      console.error('Error setting captain:', error);
      toast.error('Failed to set captain');
    }
  };

  const setViceCaptain = async (rosterId: string) => {
    try {
      // Remove vice captain from all players
      await supabase
        .from('rosters')
        .update({ is_vice_captain: false })
        .eq('fantasy_team_id', fantasyTeam?.fantasy_team_id);

      // Set new vice captain
      const { error } = await supabase
        .from('rosters')
        .update({ is_vice_captain: true })
        .eq('roster_id', rosterId);

      if (error) throw error;

      toast.success('Vice captain updated');
      if (fantasyTeam) {
        await fetchRoster(fantasyTeam.fantasy_team_id);
      }
    } catch (error) {
      console.error('Error setting vice captain:', error);
      toast.error('Failed to set vice captain');
    }
  };

  const handlePlayerClick = (player: PlayerWithTeam) => {
    setSelectedPlayerForProfile(player);
    setShowPlayerProfile(true);
  };

  const handleTeamCreated = () => {
    // Refresh the team data after creation
    fetchFantasyTeam();
  };

  const openPlayerModal = (rosterId: string, position: string) => {
    if (!transferData.canMakeTransfers) {
      toast.error('Transfers are not allowed at this time');
      return;
    }
    
    setReplacingRosterId(rosterId);
    setSelectedPosition(position);
    setShowPlayerModal(true);
  };

  const closePlayerModal = () => {
    setShowPlayerModal(false);
    setReplacingRosterId(null);
    setSelectedPosition('');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // If user doesn't have a fantasy team, show team creation
  if (!fantasyTeam) {
    return <TeamCreation onTeamCreated={handleTeamCreated} />;
  }

  const formation = getFormationCounts();
  const starters = roster.filter(r => r.is_starter);
  const bench = roster.filter(r => !r.is_starter);
  const captain = roster.find(r => r.is_captain);
  const viceCaptain = roster.find(r => r.is_vice_captain);

  return (
    <div className="max-w-7xl mx-auto space-y-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen p-4">
      {/* Team Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold">{fantasyTeam.team_name}</h1>
            <p className="text-emerald-100">Your Fantasy Soccer Team</p>
          </div>
          <div className="flex items-center space-x-4">
            {transferData.canMakeTransfers && (
              <button
                onClick={() => {
                  setEditMode(!editMode);
                  if (!editMode) {
                    fetchAvailablePlayers();
                  }
                }}
                className={`px-6 py-3 rounded-xl transition-all duration-200 flex items-center font-medium ${
                  editMode 
                    ? 'bg-red-500 hover:bg-red-600 shadow-lg' 
                    : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'
                }`}
              >
                {editMode ? (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Team
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Team Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20">
            <div className="flex items-center">
              <Trophy className="h-5 w-5 mr-2" />
              <div>
                <p className="text-sm text-emerald-100">Total Points</p>
                <p className="text-lg font-semibold">{fantasyTeam.total_points}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              <div>
                <p className="text-sm text-emerald-100">This Gameweek</p>
                <p className="text-lg font-semibold">{fantasyTeam.gameweek_points}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20">
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              <div>
                <p className="text-sm text-emerald-100">Budget Left</p>
                <p className="text-lg font-semibold">£{fantasyTeam.budget_remaining}M</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20">
            <div className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              <div>
                <p className="text-sm text-emerald-100">Rank</p>
                <p className="text-lg font-semibold">#{fantasyTeam.rank}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GameweekStatus />
        <TransferStatus fantasyTeamId={fantasyTeam.fantasy_team_id} />
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('team')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'team'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="h-4 w-4 inline mr-2" />
              My Team
            </button>
            <button
              onClick={() => setActiveTab('points')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'points'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <TrendingUp className="h-4 w-4 inline mr-2" />
              Live Points
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'team' && (
        <>
          {/* Formation and Pitch */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/50">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Formation: {formation.defenders}-{formation.midfielders}-{formation.forwards}
              </h2>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                {captain && (
                  <div className="flex items-center bg-yellow-100 px-3 py-1 rounded-full">
                    <Crown className="h-4 w-4 text-yellow-600 mr-1" />
                    Captain: {captain.player?.name}
                  </div>
                )}
                {viceCaptain && (
                  <div className="flex items-center bg-gray-100 px-3 py-1 rounded-full">
                    <Star className="h-4 w-4 text-gray-600 mr-1" />
                    Vice: {viceCaptain.player?.name}
                  </div>
                )}
              </div>
            </div>

            {/* Soccer Pitch */}
            <div 
              className="relative rounded-2xl min-h-[600px] bg-cover bg-center bg-no-repeat p-8 border-2 border-emerald-200"
              style={{
                backgroundImage: `url('https://i.imgur.com/x6NH58g.png')`,
                backgroundSize: 'cover'
              }}
            >
              {/* Starting XI */}
              <div className="relative h-full flex flex-col justify-between py-8">
                {/* Goalkeeper */}
                <div className="flex justify-center mb-8">
                  {getPlayersByPosition('GK', true).map((rosterPlayer) => (
                    <PlayerCard
                      key={rosterPlayer.roster_id}
                      rosterPlayer={rosterPlayer}
                      editMode={editMode}
                      canMakeTransfers={transferData.canMakeTransfers}
                      onReplace={() => openPlayerModal(rosterPlayer.roster_id, 'GK')}
                      onSetCaptain={() => setCaptain(rosterPlayer.roster_id)}
                      onSetViceCaptain={() => setViceCaptain(rosterPlayer.roster_id)}
                      onPlayerClick={() => handlePlayerClick(rosterPlayer.player)}
                    />
                  ))}
                </div>

                {/* Defenders */}
                <div className="flex justify-center space-x-6 mb-8">
                  {getPlayersByPosition('DEF', true).map((rosterPlayer) => (
                    <PlayerCard
                      key={rosterPlayer.roster_id}
                      rosterPlayer={rosterPlayer}
                      editMode={editMode}
                      canMakeTransfers={transferData.canMakeTransfers}
                      onReplace={() => openPlayerModal(rosterPlayer.roster_id, 'DEF')}
                      onSetCaptain={() => setCaptain(rosterPlayer.roster_id)}
                      onSetViceCaptain={() => setViceCaptain(rosterPlayer.roster_id)}
                      onPlayerClick={() => handlePlayerClick(rosterPlayer.player)}
                    />
                  ))}
                </div>

                {/* Midfielders */}
                <div className="flex justify-center space-x-6 mb-8">
                  {getPlayersByPosition('MID', true).map((rosterPlayer) => (
                    <PlayerCard
                      key={rosterPlayer.roster_id}
                      rosterPlayer={rosterPlayer}
                      editMode={editMode}
                      canMakeTransfers={transferData.canMakeTransfers}
                      onReplace={() => openPlayerModal(rosterPlayer.roster_id, 'MID')}
                      onSetCaptain={() => setCaptain(rosterPlayer.roster_id)}
                      onSetViceCaptain={() => setViceCaptain(rosterPlayer.roster_id)}
                      onPlayerClick={() => handlePlayerClick(rosterPlayer.player)}
                    />
                  ))}
                </div>

                {/* Forwards */}
                <div className="flex justify-center space-x-6">
                  {getPlayersByPosition('FWD', true).map((rosterPlayer) => (
                    <PlayerCard
                      key={rosterPlayer.roster_id}
                      rosterPlayer={rosterPlayer}
                      editMode={editMode}
                      canMakeTransfers={transferData.canMakeTransfers}
                      onReplace={() => openPlayerModal(rosterPlayer.roster_id, 'FWD')}
                      onSetCaptain={() => setCaptain(rosterPlayer.roster_id)}
                      onSetViceCaptain={() => setViceCaptain(rosterPlayer.roster_id)}
                      onPlayerClick={() => handlePlayerClick(rosterPlayer.player)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bench */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/50">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Substitutes</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {bench.map((rosterPlayer) => (
                <div key={rosterPlayer.roster_id} className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
                  <div className="flex flex-col items-center">
                    {/* Player Jersey */}
                    <div 
                      className="w-60 h-60 mb-2 relative cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => handlePlayerClick(rosterPlayer.player)}
                    >
                      {rosterPlayer.player?.team_jersey ? (
                        <img
                          src={rosterPlayer.player.team_jersey}
                          alt={`${rosterPlayer.player?.team_name} jersey`}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling!.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className={`w-full h-full bg-gray-300 rounded-lg flex items-center justify-center ${
                          rosterPlayer.player?.team_jersey ? 'hidden' : 'flex'
                        }`}
                      >
                        <span className="text-xs text-gray-500">No Jersey</span>
                      </div>
                      
                      {/* Captain/Vice Captain badges */}
                      {rosterPlayer.is_captain && (
                        <div className="absolute -top-1 -right-1 bg-yellow-500 text-white rounded-full p-1">
                          <Crown className="h-3 w-3" />
                        </div>
                      )}
                      {rosterPlayer.is_vice_captain && (
                        <div className="absolute -top-1 -right-1 bg-gray-500 text-white rounded-full p-1">
                          <Star className="h-3 w-3" />
                        </div>
                      )}
                    </div>

                    {/* Player Info */}
                    <div className="text-center">
                      <div 
                        className="font-medium text-gray-900 text-sm mb-1 cursor-pointer hover:text-emerald-600 transition-colors"
                        onClick={() => handlePlayerClick(rosterPlayer.player)}
                      >
                        {rosterPlayer.player?.name}
                      </div>
                      <div className="text-xs text-gray-600 mb-1">£{rosterPlayer.player?.price}M</div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        rosterPlayer.player?.position === 'GK' ? 'bg-purple-100 text-purple-800' :
                        rosterPlayer.player?.position === 'DEF' ? 'bg-blue-100 text-blue-800' :
                        rosterPlayer.player?.position === 'MID' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {rosterPlayer.player?.position}
                      </span>
                    </div>

                    {editMode && transferData.canMakeTransfers && (
                      <button
                        onClick={() => openPlayerModal(rosterPlayer.roster_id, rosterPlayer.player?.position || '')}
                        className="mt-2 text-emerald-600 hover:text-emerald-700 text-xs bg-emerald-50 px-2 py-1 rounded-full hover:bg-emerald-100 transition-colors"
                      >
                        <Edit className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'points' && (
        <LivePointsTracker fantasyTeamId={fantasyTeam.fantasy_team_id} />
      )}

      {/* Player Replacement Modal */}
      {showPlayerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-800">Replace {selectedPosition} Player</h3>
                {fantasyTeam && (
                  <p className="text-sm text-gray-600 mt-1">
                    Current Budget: £{fantasyTeam.budget_remaining}M | Transfers Remaining: {transferData.transfersRemaining}
                  </p>
                )}
              </div>
              <button onClick={closePlayerModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {availablePlayers
                .filter(player => player.position === selectedPosition)
                .map((player) => {
                  const currentPlayer = roster.find(r => r.roster_id === replacingRosterId)?.player;
                  const budgetAfterTransfer = currentPlayer ? calculateBudgetAfterTransfer(currentPlayer, player) : fantasyTeam?.budget_remaining || 0;
                  const canAfford = budgetAfterTransfer >= 0;
                  const priceDifference = currentPlayer ? player.price - currentPlayer.price : 0;
                  
                  return (
                    <div key={player.player_id} className={`flex items-center justify-between p-4 border rounded-xl transition-all duration-200 ${
                      canAfford ? 'hover:bg-emerald-50 border-gray-200 hover:border-emerald-300' : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-20 flex-shrink-0">
                          {player.team_jersey ? (
                            <img
                              src={player.team_jersey}
                              alt={`${player.team_name} jersey`}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling!.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className={`w-full h-full bg-gray-300 rounded-lg flex items-center justify-center ${
                            player.team_jersey ? 'hidden' : 'flex'
                          }`}>
                            <span className="text-xs text-gray-500">No Jersey</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{player.name}</div>
                          <div className="text-sm text-gray-500">{player.team_name}</div>
                          <div className="text-sm font-medium text-gray-700">£{player.price}M</div>
                          {priceDifference !== 0 && (
                            <div className={`text-xs ${priceDifference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {priceDifference > 0 ? '+' : ''}£{priceDifference.toFixed(1)}M
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600 mb-2">
                          Budget after: £{budgetAfterTransfer.toFixed(1)}M
                        </div>
                        <button
                          onClick={() => replacingRosterId && handlePlayerReplace(replacingRosterId, player.player_id)}
                          disabled={!canAfford}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            canAfford 
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {canAfford ? 'Select' : 'Can\'t Afford'}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Player Profile Modal */}
      {showPlayerProfile && selectedPlayerForProfile && (
        <PlayerProfileModal
          player={selectedPlayerForProfile}
          onClose={() => {
            setShowPlayerProfile(false);
            setSelectedPlayerForProfile(null);
          }}
        />
      )}
    </div>
  );
}

// Player Card Component
interface PlayerCardProps {
  rosterPlayer: RosterPlayer;
  editMode: boolean;
  canMakeTransfers: boolean;
  onReplace: () => void;
  onSetCaptain: () => void;
  onSetViceCaptain: () => void;
  onPlayerClick: () => void;
}

function PlayerCard({ rosterPlayer, editMode, canMakeTransfers, onReplace, onSetCaptain, onSetViceCaptain, onPlayerClick }: PlayerCardProps) {
  return (
    <div className="relative flex flex-col items-center">
      {/* Player Jersey - Bigger Size */}
      <div 
        className="w-60 h-60 relative cursor-pointer hover:scale-105 transition-transform mb-1"
        onClick={onPlayerClick}
      >
        {rosterPlayer.player?.team_jersey ? (
          <img
            src={rosterPlayer.player.team_jersey}
            alt={`${rosterPlayer.player?.team_name} jersey`}
            className="w-full h-full object-contain drop-shadow-lg"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling!.style.display = 'flex';
            }}
          />
        ) : null}
        <div 
          className={`w-full h-full bg-white rounded-lg flex items-center justify-center shadow-lg border-2 border-gray-200 ${
            rosterPlayer.player?.team_jersey ? 'hidden' : 'flex'
          }`}
        >
          <span className="text-sm text-gray-500">No Jersey</span>
        </div>
        
        {/* Captain/Vice Captain badges */}
        {rosterPlayer.is_captain && (
          <div className="absolute -top-2 -right-2 bg-yellow-500 text-white rounded-full p-1 shadow-lg">
            <Crown className="h-4 w-4" />
          </div>
        )}
        {rosterPlayer.is_vice_captain && (
          <div className="absolute -top-2 -right-2 bg-gray-500 text-white rounded-full p-1 shadow-lg">
            <Star className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Player Info Card - Very close to jersey */}
      <div 
        className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-2 min-w-[140px] text-center cursor-pointer hover:bg-white transition-all duration-200 border border-white/50"
        onClick={onPlayerClick}
      >
        <div className="font-semibold text-sm text-gray-900 truncate px-1">
          {rosterPlayer.player?.name}
        </div>
        <div className="text-xs font-medium text-emerald-600">
          £{rosterPlayer.player?.price}M
        </div>
      </div>

      {editMode && canMakeTransfers && (
        <div className="mt-2 flex space-x-1">
          <button
            onClick={onReplace}
            className="bg-emerald-500 text-white px-2 py-1 rounded-lg text-xs hover:bg-emerald-600 transition-colors shadow-md"
          >
            Replace
          </button>
          <button
            onClick={onSetCaptain}
            className="bg-yellow-500 text-white px-2 py-1 rounded-lg text-xs hover:bg-yellow-600 transition-colors shadow-md"
          >
            C
          </button>
          <button
            onClick={onSetViceCaptain}
            className="bg-gray-500 text-white px-2 py-1 rounded-lg text-xs hover:bg-gray-600 transition-colors shadow-md"
          >
            VC
          </button>
        </div>
      )}
    </div>
  );
}