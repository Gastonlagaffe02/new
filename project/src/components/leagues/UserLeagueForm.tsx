import React from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { League } from '../../types/database';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface UserLeagueFormProps {
  league?: League | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface LeagueFormData {
  name: string;
  max_participants: number;
  entry_fee: number;
  start_date?: string;
  end_date?: string;
}

export default function UserLeagueForm({ league, onSuccess, onCancel }: UserLeagueFormProps) {
  const { user } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm<LeagueFormData>({
    defaultValues: league ? {
      name: league.name,
      max_participants: league.max_participants,
      entry_fee: league.entry_fee,
      start_date: league.start_date ? new Date(league.start_date).toISOString().split('T')[0] : '',
      end_date: league.end_date ? new Date(league.end_date).toISOString().split('T')[0] : '',
    } : {
      max_participants: 10,
      entry_fee: 0,
    }
  });

  const entryFee = watch('entry_fee');
  const maxParticipants = watch('max_participants');

  // Calculate automatic prize pool (90% of total entry fees, 10% platform fee)
  const totalEntryFees = (entryFee || 0) * (maxParticipants || 0);
  const prizePool = totalEntryFees * 0.9;

  const onSubmit = async (data: LeagueFormData) => {
    if (!user) {
      toast.error('You must be logged in to create a league');
      return;
    }

    try {
      const leagueData = {
        name: data.name,
        creator_id: user.id,
        max_participants: data.max_participants,
        current_participants: league ? league.current_participants : 0,
        entry_fee: data.entry_fee,
        prize_pool: prizePool, // Automatically calculated
        budget_limit: 100.0, // Fixed budget limit
        status: league ? league.status : 'draft' as const,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        gameweek_current: league ? league.gameweek_current : 1,
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
      <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {league ? 'Edit League' : 'Create New League'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              League Name *
            </label>
            <input
              type="text"
              {...register('name', { required: 'League name is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Enter league name"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maximum Participants *
            </label>
            <input
              type="number"
              {...register('max_participants', { 
                required: 'Max participants is required',
                valueAsNumber: true,
                min: { value: 2, message: 'Must have at least 2 participants' },
                max: { value: 50, message: 'Cannot exceed 50 participants' }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            {errors.max_participants && (
              <p className="text-red-500 text-sm mt-1">{errors.max_participants.message}</p>
            )}
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
                min: { value: 0, message: 'Entry fee cannot be negative' }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500 mt-1">
              Set to $0 for free leagues
            </p>
          </div>

          {/* Prize Pool Display */}
          <div className="bg-emerald-50 p-3 rounded-lg">
            <div className="text-sm text-emerald-700">
              <div className="font-medium">Prize Pool Calculation:</div>
              <div className="mt-1 space-y-1">
                <div>Total Entry Fees: ${totalEntryFees.toFixed(2)}</div>
                <div>Prize Pool (90%): ${prizePool.toFixed(2)}</div>
                <div className="text-xs text-emerald-600">Platform Fee (10%): ${(totalEntryFees * 0.1).toFixed(2)}</div>
              </div>
            </div>
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

          {/* Automatic Fields Info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">
              <div className="font-medium mb-2">Automatic Settings:</div>
              <ul className="space-y-1 text-xs">
                <li>• Budget Limit: $100M (fixed)</li>
                <li>• Status: Draft (until manually activated)</li>
                <li>• Current Gameweek: 1</li>
                <li>• Scoring System: Standard fantasy rules</li>
              </ul>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
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