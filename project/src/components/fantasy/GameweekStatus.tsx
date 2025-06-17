import React from 'react';
import { Clock, Calendar, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useGameweek } from '../../hooks/useGameweek';

export default function GameweekStatus() {
  const { gameweekStatus, loading, formatTimeRemaining } = useGameweek();

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  const { current, next, transfersAllowed, timeUntilDeadline, timeUntilStart, timeUntilEnd, isGameweekActive } = gameweekStatus;

  const getStatusIcon = () => {
    if (isGameweekActive) {
      return <Clock className="h-5 w-5 text-green-600" />;
    } else if (!transfersAllowed) {
      return <XCircle className="h-5 w-5 text-red-600" />;
    } else {
      return <CheckCircle className="h-5 w-5 text-emerald-600" />;
    }
  };

  const getStatusText = () => {
    if (isGameweekActive) {
      return 'Gameweek Active';
    } else if (!transfersAllowed) {
      return 'Transfers Locked';
    } else {
      return 'Transfers Open';
    }
  };

  const getStatusColor = () => {
    if (isGameweekActive) {
      return 'bg-green-50 border-green-200';
    } else if (!transfersAllowed) {
      return 'bg-red-50 border-red-200';
    } else {
      return 'bg-emerald-50 border-emerald-200';
    }
  };

  const relevantGameweek = current || next;

  return (
    <div className={`rounded-xl shadow-sm p-4 border ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="font-medium text-gray-900">{getStatusText()}</span>
        </div>
        {relevantGameweek && (
          <span className="text-sm font-medium text-gray-600">
            {relevantGameweek.name}
          </span>
        )}
      </div>

      {relevantGameweek && (
        <div className="space-y-2 text-sm">
          {/* Transfer Deadline */}
          {timeUntilDeadline && timeUntilDeadline > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Transfer Deadline:</span>
              <span className="font-medium text-orange-600">
                {formatTimeRemaining(timeUntilDeadline)}
              </span>
            </div>
          )}

          {/* Gameweek Start */}
          {timeUntilStart && timeUntilStart > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Gameweek Starts:</span>
              <span className="font-medium text-blue-600">
                {formatTimeRemaining(timeUntilStart)}
              </span>
            </div>
          )}

          {/* Gameweek End */}
          {isGameweekActive && timeUntilEnd && timeUntilEnd > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Gameweek Ends:</span>
              <span className="font-medium text-green-600">
                {formatTimeRemaining(timeUntilEnd)}
              </span>
            </div>
          )}

          {/* Status Messages */}
          {!transfersAllowed && !isGameweekActive && (
            <div className="flex items-center space-x-2 text-red-600 mt-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs">Transfer deadline has passed</span>
            </div>
          )}

          {isGameweekActive && (
            <div className="flex items-center space-x-2 text-green-600 mt-2">
              <Calendar className="h-4 w-4" />
              <span className="text-xs">Gameweek in progress - points updating live</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}