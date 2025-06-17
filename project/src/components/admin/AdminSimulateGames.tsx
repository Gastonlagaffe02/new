import React, { useState } from 'react';
import { Play, BarChart3, Settings } from 'lucide-react';
import LiveMatchSimulation from '../simulation/LiveMatchSimulation';
import GameweekManager from './GameweekManager';
import SimulationAnalytics from '../simulation/SimulationAnalytics';

type TabType = 'simulate' | 'gameweeks' | 'analytics';

export default function AdminSimulateGames() {
  const [activeTab, setActiveTab] = useState<TabType>('gameweeks');

  const tabs = [
    { id: 'gameweeks' as TabType, name: 'Gameweek Management', icon: Settings },
    { id: 'simulate' as TabType, name: 'Match Simulation', icon: Play },
    { id: 'analytics' as TabType, name: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center ${
                    activeTab === tab.id
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'gameweeks' && <GameweekManager />}
        {activeTab === 'simulate' && <LiveMatchSimulation />}
        {activeTab === 'analytics' && <SimulationAnalytics />}
      </div>
    </div>
  );
}