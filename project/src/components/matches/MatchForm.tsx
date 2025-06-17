import React from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { RealMatch, Team } from '../../types/database';
import toast from 'react-hot-toast';

interface MatchFormProps {
  match?: RealMatch | null;
  teams: Team[];
  onSuccess: () => void;
  onCancel: () => void;
}

interface MatchFormData {
  gameweek: number;
  home_team_id?: string;
  away_team_id?: string;
  home_score?: number;
  away_score?: number;
  match_date?: string;
  status: 'scheduled' | 'live' | 'completed' | 'postponed';
}

export default function MatchForm({ match, teams, onSuccess, onCancel }: MatchFormProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm<MatchFormData>({
    defaultValues: match ? {
      gameweek: match.gameweek,
      home_team_id: match.home_team_id || '',
      away_team_id: match.away_team_id || '',
      home_score: match.home_score || undefined,
      away_score: match.away_score || undefined,
      match_date: match.match_date ? new Date(match.match_date).toISOString().slice(0, 16) : '',
      status: match.status,
    } : {
      gameweek: 1,
      status: 'scheduled',
    }
  });

  const status = watch('status');

  const onSubmit = async (data: MatchFormData) => {
    try {
      const matchData = {
        ...data,
        home_team_id: data.home_team_id || null,
        away_team_id: data.away_team_id || null,
        home_score: data.home_score || null,
        away_score: data.away_score || null,
        match_date: data.match_date ? new Date(data.match_date).toISOString() : null,
      };

      if (match) {
        const { error } = await supabase
          .from('real_matches')
          .update(matchData)
          .eq('match_id', match.match_id);

        if (error) throw error;
        toast.success('Match updated successfully');
      } else {
        const { error } = await supabase
          .from('real_matches')
          .insert([matchData]);

        if (error) throw error;
        toast.success('Match created successfully');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving match:', error);
      toast.error('Failed to save match');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {match ? 'Edit Match' : 'Add New Match'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gameweek *
            </label>
            <input
              type="number"
              {...register('gameweek', { 
                required: 'Gameweek is required',
                valueAsNumber: true,
                min: { value: 1, message: 'Gameweek must be at least 1' }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            {errors.gameweek && (
              <p className="text-red-500 text-sm mt-1">{errors.gameweek.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Home Team
            </label>
            <select
              {...register('home_team_id')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Select Home Team</option>
              {teams.map(team => (
                <option key={team.team_id} value={team.team_id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Away Team
            </label>
            <select
              {...register('away_team_id')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Select Away Team</option>
              {teams.map(team => (
                <option key={team.team_id} value={team.team_id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Match Date & Time
            </label>
            <input
              type="datetime-local"
              {...register('match_date')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              {...register('status')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="scheduled">Scheduled</option>
              <option value="live">Live</option>
              <option value="completed">Completed</option>
              <option value="postponed">Postponed</option>
            </select>
          </div>

          {(status === 'completed' || status === 'live') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Home Score
                </label>
                <input
                  type="number"
                  {...register('home_score', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Score cannot be negative' }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Away Score
                </label>
                <input
                  type="number"
                  {...register('away_score', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Score cannot be negative' }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Saving...' : (match ? 'Update Match' : 'Create Match')}
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