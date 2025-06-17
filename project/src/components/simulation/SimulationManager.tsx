import React, { useState } from 'react';
import { Play, BarChart3, History } from 'lucide-react';
import LiveMatchSimulation from './LiveMatchSimulation';
import SimulationHistory from './SimulationHistory';
import SimulationAnalytics from './SimulationAnalytics';

type TabType = 'live' | 'history' | 'analytics';

export default function SimulationManager() {
  const [activeTab, setActiveTab] = useState<TabType>('live');

  const tabs = [
    { id: 'live' as TabType, name: 'Live Simulation', icon: Play },
    { id: 'history' as TabType, name: 'Match History', icon: History },
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
        {activeTab === 'live' && <LiveMatchSimulation />}
        {activeTab === 'history' && <SimulationHistory />}
        {activeTab === 'analytics' && <SimulationAnalytics />}
      </div>
    </div>
  );
}