import React, { useState, useEffect } from 'react';
import { Search, Filter, Users, DollarSign, Trophy, Plus, Minus, Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Player, Team } from '../../types/database';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface SelectedPlayer extends Player {
  squad_position: 'starting_gk' | 'backup_gk' | 'starting_def' | 'bench_def' | 'starting_mid' | 'bench_mid' | 'starting_fwd' | 'bench_fwd';
  is_starter: boolean;
  is_captain?: boolean;
  is_vice_captain?: boolean;
}

interface FormationCounts {
  defenders: number;
  midfielders: number;
  forwards: number;
}

interface TeamCreationProps {
  onTeamCreated?: () => void;
}

const FORMATIONS = [
  { name: '3-4-3', defenders: 3, midfielders: 4, forwards: 3 },
  { name: '3-5-2', defenders: 3, midfielders: 5, forwards: 2 },
  { name: '4-3-3', defenders: 4, midfielders: 3, forwards: 3 },
  { name: '4-4-2', defenders: 4, midfielders: 4, forwards: 2 },
  { name: '4-5-1', defenders: 4, midfielders: 5, forwards: 1 },
  { name: '5-3-2', defenders: 5, midfielders: 3, forwards: 2 },
  { name: '5-4-1', defenders: 5, midfielders: 4, forwards: 1 },
];

export default function TeamCreation({ onTeamCreated }: TeamCreationProps) {
  const { user } = useAuth();
  const [players, setPlayers] = useState<(Player & { team_name?: string })[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<SelectedPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [sortBy, setSortBy] = useState('price_asc');
  const [selectedFormation, setSelectedFormation] = useState<FormationCounts>(FORMATIONS[2]); // Default to 4-3-3
  const [teamName, setTeamName] = useState('');
  const [showFormationModal, setShowFormationModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const BUDGET_LIMIT = 100;

  useEffect(() => {
    fetchPlayers();
    fetchTeams();
  }, []);

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select(`
          *,
          teams:team_id (
            name
          )
        `)
        .order('name');

      if (error) throw error;
      
      const playersWithTeamNames = data?.map(player => ({
        ...player,
        team_name: player.teams?.name
      })) || [];
      
      setPlayers(playersWithTeamNames);
    } catch (error) {
      console.error('Error fetching players:', error);
      toast.error('Failed to fetch players');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name');

      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const getTotalSpent = () => {
    return selectedPlayers.reduce((total, player) => total + player.price, 0);
  };

  const getRemainingBudget = () => {
    return BUDGET_LIMIT - getTotalSpent();
  };

  const getPositionCounts = () => {
    const counts = {
      GK: selectedPlayers.filter(p => p.position === 'GK').length,
      DEF: selectedPlayers.filter(p => p.position === 'DEF').length,
      MID: selectedPlayers.filter(p => p.position === 'MID').length,
      FWD: selectedPlayers.filter(p => p.position === 'FWD').length,
    };
    
    const starterCounts = {
      GK: selectedPlayers.filter(p => p.position === 'GK' && p.is_starter).length,
      DEF: selectedPlayers.filter(p => p.position === 'DEF' && p.is_starter).length,
      MID: selectedPlayers.filter(p => p.position === 'MID' && p.is_starter).length,
      FWD: selectedPlayers.filter(p => p.position === 'FWD' && p.is_starter).length,
    };

    return { counts, starterCounts };
  };

  const canAddPlayer = (player: Player) => {
    const { counts } = getPositionCounts();
    const maxCounts = { GK: 2, DEF: 5, MID: 5, FWD: 3 };
    
    return (
      selectedPlayers.length < 15 &&
      counts[player.position] < maxCounts[player.position] &&
      getRemainingBudget() >= player.price &&
      !selectedPlayers.find(p => p.player_id === player.player_id)
    );
  };

  const addPlayer = (player: Player) => {
    if (!canAddPlayer(player)) return;

    const { counts, starterCounts } = getPositionCounts();
    
    // Determine if this should be a starter or bench player
    let isStarter = false;
    let squadPosition: SelectedPlayer['squad_position'];

    if (player.position === 'GK') {
      isStarter = starterCounts.GK === 0;
      squadPosition = isStarter ? 'starting_gk' : 'backup_gk';
    } else if (player.position === 'DEF') {
      isStarter = starterCounts.DEF < selectedFormation.defenders;
      squadPosition = isStarter ? 'starting_def' : 'bench_def';
    } else if (player.position === 'MID') {
      isStarter = starterCounts.MID < selectedFormation.midfielders;
      squadPosition = isStarter ? 'starting_mid' : 'bench_mid';
    } else { // FWD
      isStarter = starterCounts.FWD < selectedFormation.forwards;
      squadPosition = isStarter ? 'starting_fwd' : 'bench_fwd';
    }

    const selectedPlayer: SelectedPlayer = {
      ...player,
      squad_position: squadPosition,
      is_starter: isStarter,
    };

    setSelectedPlayers([...selectedPlayers, selectedPlayer]);
    toast.success(`${player.name} added to your team`);
  };

  const removePlayer = (playerId: string) => {
    const updatedPlayers = selectedPlayers.filter(p => p.player_id !== playerId);
    
    // Reorganize positions after removal
    const reorganizedPlayers = reorganizePositions(updatedPlayers);
    setSelectedPlayers(reorganizedPlayers);
    
    const removedPlayer = selectedPlayers.find(p => p.player_id === playerId);
    if (removedPlayer) {
      toast.success(`${removedPlayer.name} removed from your team`);
    }
  };

  const reorganizePositions = (players: SelectedPlayer[]): SelectedPlayer[] => {
    const gks = players.filter(p => p.position === 'GK');
    const defs = players.filter(p => p.position === 'DEF');
    const mids = players.filter(p => p.position === 'MID');
    const fwds = players.filter(p => p.position === 'FWD');

    const reorganized: SelectedPlayer[] = [];

    // Assign GKs
    gks.forEach((player, index) => {
      reorganized.push({
        ...player,
        is_starter: index === 0,
        squad_position: index === 0 ? 'starting_gk' : 'backup_gk'
      });
    });

    // Assign DEFs
    defs.forEach((player, index) => {
      reorganized.push({
        ...player,
        is_starter: index < selectedFormation.defenders,
        squad_position: index < selectedFormation.defenders ? 'starting_def' : 'bench_def'
      });
    });

    // Assign MIDs
    mids.forEach((player, index) => {
      reorganized.push({
        ...player,
        is_starter: index < selectedFormation.midfielders,
        squad_position: index < selectedFormation.midfielders ? 'starting_mid' : 'bench_mid'
      });
    });

    // Assign FWDs
    fwds.forEach((player, index) => {
      reorganized.push({
        ...player,
        is_starter: index < selectedFormation.forwards,
        squad_position: index < selectedFormation.forwards ? 'starting_fwd' : 'bench_fwd'
      });
    });

    return reorganized;
  };

  const changeFormation = (formation: FormationCounts) => {
    setSelectedFormation(formation);
    const reorganizedPlayers = reorganizePositions(selectedPlayers);
    setSelectedPlayers(reorganizedPlayers);
    setShowFormationModal(false);
    toast.success(`Formation changed to ${formation.defenders}-${formation.midfielders}-${formation.forwards}`);
  };

  const setCaptain = (playerId: string) => {
    const updatedPlayers = selectedPlayers.map(player => ({
      ...player,
      is_captain: player.player_id === playerId,
      is_vice_captain: player.is_captain ? false : player.is_vice_captain
    }));
    setSelectedPlayers(updatedPlayers);
  };

  const setViceCaptain = (playerId: string) => {
    const updatedPlayers = selectedPlayers.map(player => ({
      ...player,
      is_vice_captain: player.player_id === playerId && !player.is_captain,
    }));
    setSelectedPlayers(updatedPlayers);
  };

  const isTeamComplete = () => {
    const { counts } = getPositionCounts();
    return (
      selectedPlayers.length === 15 &&
      counts.GK === 2 &&
      counts.DEF === 5 &&
      counts.MID === 5 &&
      counts.FWD === 3 &&
      teamName.trim() !== '' &&
      selectedPlayers.some(p => p.is_captain) &&
      selectedPlayers.some(p => p.is_vice_captain)
    );
  };

  const createTeam = async () => {
    if (!isTeamComplete()) {
      toast.error('Please complete your team selection');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to create a team');
      return;
    }

    setCreating(true);

    try {
      // Create fantasy team
      const { data: fantasyTeam, error: teamError } = await supabase
        .from('fantasy_teams')
        .insert([{
          user_id: user.id,
          team_name: teamName,
          budget_remaining: getRemainingBudget(),
          total_points: 0,
          gameweek_points: 0,
          rank: 1,
          transfers_remaining: 2,
        }])
        .select()
        .single();

      if (teamError) throw teamError;

      // Create roster entries
      const rosterEntries = selectedPlayers.map(player => ({
        fantasy_team_id: fantasyTeam.fantasy_team_id,
        player_id: player.player_id,
        squad_position: player.squad_position,
        is_starter: player.is_starter,
        is_captain: player.is_captain || false,
        is_vice_captain: player.is_vice_captain || false,
        purchase_price: player.price,
        gameweek_added: 1,
      }));

      const { error: rosterError } = await supabase
        .from('rosters')
        .insert(rosterEntries);

      if (rosterError) throw rosterError;

      toast.success('Fantasy team created successfully!');
      
      // Call the callback to refresh the parent component
      if (onTeamCreated) {
        onTeamCreated();
      }
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error('Failed to create team');
    } finally {
      setCreating(false);
    }
  };

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.team_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPosition = !positionFilter || player.position === positionFilter;
    const matchesTeam = !teamFilter || player.team_id === teamFilter;
    
    return matchesSearch && matchesPosition && matchesTeam;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'price_asc': return a.price - b.price;
      case 'price_desc': return b.price - a.price;
      case 'points_desc': return b.total_points - a.total_points;
      case 'name_asc': return a.name.localeCompare(b.name);
      default: return 0;
    }
  });

  const { counts, starterCounts } = getPositionCounts();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Fantasy Soccer Team</h1>
        <p className="text-gray-600 mb-4">
          You currently don't have a fantasy team. Let's build one together! You'll need to select 15 players within a £{BUDGET_LIMIT}M budget.
        </p>
        
        {/* Team Name Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Team Name</label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Enter your team name"
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Budget and Squad Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-emerald-50 p-4 rounded-lg">
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-emerald-600 mr-2" />
              <div>
                <p className="text-sm text-emerald-600">Total Budget</p>
                <p className="text-lg font-semibold text-emerald-900">£{BUDGET_LIMIT}M</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <p className="text-sm text-blue-600">Current Spend</p>
                <p className="text-lg font-semibold text-blue-900">£{getTotalSpent().toFixed(1)}M</p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-purple-600 mr-2" />
              <div>
                <p className="text-sm text-purple-600">Remaining</p>
                <p className="text-lg font-semibold text-purple-900">£{getRemainingBudget().toFixed(1)}M</p>
              </div>
            </div>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-orange-600 mr-2" />
              <div>
                <p className="text-sm text-orange-600">Players Selected</p>
                <p className="text-lg font-semibold text-orange-900">{selectedPlayers.length}/15</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Player Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Squad Requirements */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Squad Requirements</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{counts.GK}/2</div>
                <div className="text-sm text-gray-600">Goalkeepers</div>
                <div className="text-xs text-gray-500">({starterCounts.GK} starter)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{counts.DEF}/5</div>
                <div className="text-sm text-gray-600">Defenders</div>
                <div className="text-xs text-gray-500">({starterCounts.DEF} starters)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">{counts.MID}/5</div>
                <div className="text-sm text-gray-600">Midfielders</div>
                <div className="text-xs text-gray-500">({starterCounts.MID} starters)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{counts.FWD}/3</div>
                <div className="text-sm text-gray-600">Forwards</div>
                <div className="text-xs text-gray-500">({starterCounts.FWD} starters)</div>
              </div>
            </div>
            
            <div className="mt-4 flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-600">Formation: </span>
                <span className="font-semibold">{selectedFormation.defenders}-{selectedFormation.midfielders}-{selectedFormation.forwards}</span>
              </div>
              <button
                onClick={() => setShowFormationModal(true)}
                className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors text-sm"
              >
                Change Formation
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Search Players</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search players..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">All Positions</option>
                <option value="GK">Goalkeeper</option>
                <option value="DEF">Defender</option>
                <option value="MID">Midfielder</option>
                <option value="FWD">Forward</option>
              </select>
              
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">All Teams</option>
                {teams.map(team => (
                  <option key={team.team_id} value={team.team_id}>
                    {team.name}
                  </option>
                ))}
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="price_asc">Price (Low to High)</option>
                <option value="price_desc">Price (High to Low)</option>
                <option value="points_desc">Points (High to Low)</option>
                <option value="name_asc">Name (A to Z)</option>
              </select>
            </div>
          </div>

          {/* Player List */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Available Players</h2>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {filteredPlayers.map((player) => {
                const isSelected = selectedPlayers.find(p => p.player_id === player.player_id);
                const canAdd = canAddPlayer(player);
                
                return (
                  <div key={player.player_id} className={`p-4 border-b border-gray-100 flex items-center justify-between ${isSelected ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          player.position === 'GK' ? 'bg-purple-100 text-purple-800' :
                          player.position === 'DEF' ? 'bg-blue-100 text-blue-800' :
                          player.position === 'MID' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {player.position}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900">{player.name}</div>
                          <div className="text-sm text-gray-500">{player.team_name}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">£{player.price}M</div>
                        <div className="text-sm text-gray-500">{player.total_points} pts</div>
                      </div>
                      {isSelected ? (
                        <button
                          onClick={() => removePlayer(player.player_id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => addPlayer(player)}
                          disabled={!canAdd}
                          className={`p-2 rounded-lg transition-colors ${
                            canAdd 
                              ? 'text-emerald-600 hover:bg-emerald-50' 
                              : 'text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Squad */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Squad</h2>
            
            {/* Starting XI */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Starting XI</h3>
              <div className="space-y-2">
                {selectedPlayers.filter(p => p.is_starter).map((player) => (
                  <div key={player.player_id} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        player.position === 'GK' ? 'bg-purple-100 text-purple-800' :
                        player.position === 'DEF' ? 'bg-blue-100 text-blue-800' :
                        player.position === 'MID' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {player.position}
                      </span>
                      <div>
                        <div className="font-medium text-sm">{player.name}</div>
                        <div className="text-xs text-gray-500">£{player.price}M</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {player.is_captain && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded">C</span>
                      )}
                      {player.is_vice_captain && (
                        <span className="bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded">VC</span>
                      )}
                      <div className="flex space-x-1">
                        <button
                          onClick={() => setCaptain(player.player_id)}
                          disabled={player.is_captain}
                          className={`text-xs px-2 py-1 rounded ${
                            player.is_captain 
                              ? 'bg-yellow-200 text-yellow-800' 
                              : 'bg-gray-100 text-gray-600 hover:bg-yellow-100'
                          }`}
                        >
                          C
                        </button>
                        <button
                          onClick={() => setViceCaptain(player.player_id)}
                          disabled={player.is_vice_captain || player.is_captain}
                          className={`text-xs px-2 py-1 rounded ${
                            player.is_vice_captain 
                              ? 'bg-gray-200 text-gray-800' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          VC
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bench */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Bench</h3>
              <div className="space-y-2">
                {selectedPlayers.filter(p => !p.is_starter).map((player) => (
                  <div key={player.player_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        player.position === 'GK' ? 'bg-purple-100 text-purple-800' :
                        player.position === 'DEF' ? 'bg-blue-100 text-blue-800' :
                        player.position === 'MID' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {player.position}
                      </span>
                      <div>
                        <div className="font-medium text-sm">{player.name}</div>
                        <div className="text-xs text-gray-500">£{player.price}M</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Create Team Button */}
            <button
              onClick={createTeam}
              disabled={!isTeamComplete() || creating}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                isTeamComplete() && !creating
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {creating ? 'Creating Team...' : isTeamComplete() ? 'Create Team' : 'Complete Your Squad'}
            </button>
            
            {!isTeamComplete() && (
              <div className="mt-2 text-sm text-gray-500">
                {selectedPlayers.length < 15 && <div>• Select {15 - selectedPlayers.length} more players</div>}
                {teamName.trim() === '' && <div>• Enter a team name</div>}
                {!selectedPlayers.some(p => p.is_captain) && <div>• Choose a captain</div>}
                {!selectedPlayers.some(p => p.is_vice_captain) && <div>• Choose a vice captain</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Formation Modal */}
      {showFormationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Choose Formation</h2>
              <button onClick={() => setShowFormationModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-3">
              {FORMATIONS.map((formation) => (
                <button
                  key={formation.name}
                  onClick={() => changeFormation(formation)}
                  className={`w-full p-3 text-left rounded-lg border transition-colors ${
                    selectedFormation.defenders === formation.defenders &&
                    selectedFormation.midfielders === formation.midfielders &&
                    selectedFormation.forwards === formation.forwards
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium">{formation.name}</div>
                  <div className="text-sm text-gray-500">
                    {formation.defenders} Defenders, {formation.midfielders} Midfielders, {formation.forwards} Forwards
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}