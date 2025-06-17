import React from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { League, User } from '../../types/database';
import toast from 'react-hot-toast';

interface LeagueFormProps {
  league?: League | null;
  users: User[];
  onSuccess: () => void;
  onCancel: () => void;
}

interface LeagueFormData {
  name: string;
  creator_id?: string;
  max_participants: number;
  current_participants: number;
  entry_fee: number;
  prize_pool: number;
  budget_limit: number;
  status: 'draft' | 'active' | 'completed';
  start_date?: string;
  end_date?: string;
  gameweek_current: number;
}

export default function LeagueForm({ league, users, onSuccess, onCancel }: LeagueFormProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LeagueFormData>({
    defaultValues: league ? {
      name: league.name,
      creator_id: league.creator_id || '',
      max_participants: league.max_participants,
      current_participants: league.current_participants,
      entry_fee: league.entry_fee,
      prize_pool: league.prize_pool,
      budget_limit: league.budget_limit,
      status: league.status,
      start_date: league.start_date ? new Date(league.start_date).toISOString().split('T')[0] : '',
      end_date: league.end_date ? new Date(league.end_date).toISOString().split('T')[0] : '',
      gameweek_current: league.gameweek_current,
    } : {
      max_participants: 10,
      current_participants: 0,
      entry_fee: 0,
      prize_pool: 0,
      budget_limit: 100,
      status: 'draft',
      gameweek_current: 1,
    }
  });

  const onSubmit = async (data: LeagueFormData) => {
    try {
      const leagueData = {
        ...data,
        creator_id: data.creator_id || null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        updated_at: new Date().toISOString(),
      };

      if (league) {
        const { error } = await supabase
          .from('leagues')
          .update(leagueData)
          .eq('league_id', league.league_id);

        if (error) throw error;
        toast.success('League updated successfully');
      } else {
        const { error } = await supabase
          .from('leagues')
          .insert([leagueData]);

        if (error) throw error;
        toast.success('League created successfully');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving league:', error);
      toast.error('Failed to save league');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {league ? 'Edit League' : 'Add New League'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                League Name *
              </label>
              <input
                type="text"
                {...register('name', { required: 'League name is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Creator
              </label>
              <select
                {...register('creator_id')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Select Creator</option>
                {users.map(user => (
                  <option key={user.user_id} value={user.user_id}>
                    {user.username}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                {...register('status')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Participants *
              </label>
              <input
                type="number"
                {...register('max_participants', { 
                  required: 'Max participants is required',
                  valueAsNumber: true,
                  min: { value: 2, message: 'Must have at least 2 participants' }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              {errors.max_participants && (
                <p className="text-red-500 text-sm mt-1">{errors.max_participants.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Participants
              </label>
              <input
                type="number"
                {...register('current_participants', { 
                  valueAsNumber: true,
                  min: { value: 0, message: 'Cannot be negative' }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entry Fee ($)
              </label>
              <input
                type="number"
                step="0.01"
                {...register('entry_fee', { 
                  valueAsNumber: true,
                  min: { value: 0, message: 'Cannot be negative' }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prize Pool ($)
              </label>
              <input
                type="number"
                step="0.01"
                {...register('prize_pool', { 
                  valueAsNumber: true,
                  min: { value: 0, message: 'Cannot be negative' }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Budget Limit ($)
              </label>
              <input
                type="number"
                step="0.1"
                {...register('budget_limit', { 
                  valueAsNumber: true,
                  min: { value: 1, message: 'Must be at least $1' }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Gameweek
              </label>
              <input
                type="number"
                {...register('gameweek_current', { 
                  valueAsNumber: true,
                  min: { value: 1, message: 'Must be at least 1' }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                {...register('start_date')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                {...register('end_date')}
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
              {isSubmitting ? 'Saving...' : (league ? 'Update League' : 'Create League')}
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