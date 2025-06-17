import React from 'react';
import { ArrowRightLeft, Clock, AlertCircle } from 'lucide-react';
import { useTransfers } from '../../hooks/useTransfers';

interface TransferStatusProps {
  fantasyTeamId?: string;
}

export default function TransferStatus({ fantasyTeamId }: TransferStatusProps) {
  const { transferData, loading } = useTransfers(fantasyTeamId);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  const { transfersRemaining, transfersMadeThisGW, transfersBanked, canMakeTransfers } = transferData;

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <ArrowRightLeft className="h-5 w-5 text-blue-600" />
          <span className="font-medium text-gray-900">Transfers</span>
        </div>
        <div className="flex items-center space-x-2">
          {canMakeTransfers ? (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Available
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Locked
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Remaining:</span>
          <span className="font-medium text-emerald-600">
            {transfersRemaining}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600">Made this GW:</span>
          <span className="font-medium text-gray-900">
            {transfersMadeThisGW}
          </span>
        </div>

        {transfersBanked > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Banked:</span>
            <span className="font-medium text-blue-600">
              {transfersBanked}
            </span>
          </div>
        )}

        {!canMakeTransfers && (
          <div className="flex items-center space-x-2 text-orange-600 mt-2 pt-2 border-t border-gray-100">
            <AlertCircle className="h-4 w-4" />
            <span className="text-xs">
              {transfersRemaining === 0 
                ? 'No transfers remaining' 
                : 'Transfers locked during gameweek'
              }
            </span>
          </div>
        )}

        <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
          • 1 free transfer per gameweek
          • Unused transfers are banked (max 2 total)
          • Transfers lock 1.5h before first match
        </div>
      </div>
    </div>
  );
}