import React from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Player, Team } from '../../types/database';
import toast from 'react-hot-toast';

interface PlayerFormProps {
  player?: Player | null;
  teams: Team[];
  onSuccess: () => void;
  onCancel: () => void;
}

interface PlayerFormData {
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  team_id?: string;
  price: number;
  injury_status: 'fit' | 'injured' | 'doubtful';
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  yellow_cards: number;
  red_cards: number;
  games_played: number;
}

export default function PlayerForm({ player, teams, onSuccess, onCancel }: PlayerFormProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PlayerFormData>({
    defaultValues: player ? {
      name: player.name,
      position: player.position,
      team_id: player.team_id || '',
      price: player.price,
      injury_status: player.injury_status,
      goals_scored: player.goals_scored,
      assists: player.assists,
      clean_sheets: player.clean_sheets,
      yellow_cards: player.yellow_cards,
      red_cards: player.red_cards,
      games_played: player.games_played,
    } : {
      price: 5.0,
      injury_status: 'fit',
      goals_scored: 0,
      assists: 0,
      clean_sheets: 0,
      yellow_cards: 0,
      red_cards: 0,
      games_played: 0,
    }
  });

  const onSubmit = async (data: PlayerFormData) => {
    try {
      const playerData = {
        ...data,
        team_id: data.team_id || null,
        updated_at: new Date().toISOString(),
      };

      if (player) {
        const { error } = await supabase
          .from('players')
          .update(playerData)
          .eq('player_id', player.player_id);

        if (error) throw error;
        toast.success('Player updated successfully');
      } else {
        const { error } = await supabase
          .from('players')
          .insert([playerData]);

        if (error) throw error;
        toast.success('Player created successfully');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving player:', error);
      toast.error('Failed to save player');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {player ? 'Edit Player' : 'Add New Player'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Player Name *
              </label>
              <input
                type="text"
                {...register('name', { required: 'Player name is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Position *
              </label>
              <select
                {...register('position', { required: 'Position is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Select Position</option>
                <option value="GK">Goalkeeper</option>
                <option value="DEF">Defender</option>
                <option value="MID">Midfielder</option>
                <option value="FWD">Forward</option>
              </select>
              {errors.position && (
                <p className="text-red-500 text-sm mt-1">{errors.position.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Team
              </label>
              <select
                {...register('team_id')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Select Team</option>
                {teams.map(team => (
                  <option key={team.team_id} value={team.team_id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price (Million) *
              </label>
              <input
                type="number"
                step="0.1"
                {...register('price', { 
                  required: 'Price is required',
                  valueAsNumber: true,
                  min: { value: 0.1, message: 'Price must be at least 0.1' }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              {errors.price && (
                <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Injury Status
              </label>
              <select
                {...register('injury_status')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="fit">Fit</option>
                <option value="injured">Injured</option>
                <option value="doubtful">Doubtful</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Games Played
              </label>
              <input
                type="number"
                {...register('games_played', { 
                  valueAsNumber: true,
                  min: { value: 0, message: 'Games played cannot be negative' }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Goals Scored
              </label>
              <input
                type="number"
                {...register('goals_scored', { 
                  valueAsNumber: true,
                  min: { value: 0, message: 'Goals cannot be negative' }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assists
              </label>
              <input
                type="number"
                {...register('assists', { 
                  valueAsNumber: true,
                  min: { value: 0, message: 'Assists cannot be negative' }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Clean Sheets
              </label>
              <input
                type="number"
                {...register('clean_sheets', { 
                  valueAsNumber: true,
                  min: { value: 0, message: 'Clean sheets cannot be negative' }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Yellow Cards
              </label>
              <input
                type="number"
                {...register('yellow_cards', { 
                  valueAsNumber: true,
                  min: { value: 0, message: 'Yellow cards cannot be negative' }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Red Cards
              </label>
              <input
                type="number"
                {...register('red_cards', { 
                  valueAsNumber: true,
                  min: { value: 0, message: 'Red cards cannot be negative' }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Saving...' : (player ? 'Update Player' : 'Create Player')}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}