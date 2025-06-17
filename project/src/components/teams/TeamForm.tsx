import React from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Team } from '../../types/database';
import toast from 'react-hot-toast';

interface TeamFormProps {
  team?: Team | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface TeamFormData {
  name: string;
  short_name: string;
  city?: string;
  stadium?: string;
  logo_url?: string;
  jersey?: string;
  founded_year?: number;
}

export default function TeamForm({ team, onSuccess, onCancel }: TeamFormProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<TeamFormData>({
    defaultValues: team ? {
      name: team.name,
      short_name: team.short_name,
      city: team.city || '',
      stadium: team.stadium || '',
      logo_url: team.logo_url || '',
      jersey: team.jersey || '',
      founded_year: team.founded_year || undefined,
    } : {}
  });

  const onSubmit = async (data: TeamFormData) => {
    try {
      const teamData = {
        ...data,
        city: data.city || null,
        stadium: data.stadium || null,
        logo_url: data.logo_url || null,
        jersey: data.jersey || null,
        founded_year: data.founded_year || null,
        updated_at: new Date().toISOString(),
      };

      if (team) {
        const { error } = await supabase
          .from('teams')
          .update(teamData)
          .eq('team_id', team.team_id);

        if (error) throw error;
        toast.success('Team updated successfully');
      } else {
        const { error } = await supabase
          .from('teams')
          .insert([teamData]);

        if (error) throw error;
        toast.success('Team created successfully');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving team:', error);
      toast.error('Failed to save team');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {team ? 'Edit Team' : 'Add New Team'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Team Name *
            </label>
            <input
              type="text"
              {...register('name', { required: 'Team name is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Short Name *
            </label>
            <input
              type="text"
              {...register('short_name', { required: 'Short name is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            {errors.short_name && (
              <p className="text-red-500 text-sm mt-1">{errors.short_name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              {...register('city')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stadium
            </label>
            <input
              type="text"
              {...register('stadium')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Founded Year
            </label>
            <input
              type="number"
              {...register('founded_year', { 
                valueAsNumber: true,
                min: { value: 1800, message: 'Year must be after 1800' },
                max: { value: new Date().getFullYear(), message: 'Year cannot be in the future' }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            {errors.founded_year && (
              <p className="text-red-500 text-sm mt-1">{errors.founded_year.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Logo URL
            </label>
            <input
              type="url"
              {...register('logo_url')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Jersey URL
            </label>
            <input
              type="url"
              {...register('jersey')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="URL to team jersey image"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Saving...' : (team ? 'Update Team' : 'Create Team')}
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