import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Shield, 
  Trophy, 
  Group as UserGroup, 
  Calendar, 
  BarChart3, 
  Settings, 
  Home,
  LogOut,
  X,
  User,
  Play,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

const adminNavigation = [
  { id: 'dashboard', name: 'Dashboard', path: '/', icon: Home },
  { id: 'teams', name: 'Teams', path: '/teams', icon: UserGroup },
  { id: 'players', name: 'Players', path: '/players', icon: Users },
  { id: 'users', name: 'Users', path: '/users', icon: Shield },
  { id: 'leagues', name: 'Leagues', path: '/leagues', icon: Trophy },
  { id: 'matches', name: 'Real Matches', path: '/matches', icon: Calendar },
  { id: 'simulate', name: 'Simulate Games', path: '/admin/simulate-games', icon: Play },
  { id: 'analytics', name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { id: 'settings', name: 'Settings', path: '/settings', icon: Settings },
];

const userNavigation = [
  { id: 'my-team', name: 'My Team', path: '/team', icon: User },
  { id: 'team-points', name: 'Team Points', path: '/teampoint', icon: TrendingUp },
  { id: 'leagues', name: 'Leagues', path: '/leagues', icon: Trophy },
  { id: 'fixtures', name: 'Fixtures', path: '/fixtures', icon: Calendar },
];

export default function Sidebar({ isOpen, onClose, isAdmin = false }: SidebarProps) {
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navigation = isAdmin ? adminNavigation : userNavigation;

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <>
      {/* Mobile Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:hidden transition-transform duration-200 ease-in-out z-40 bg-gray-900 text-white w-64 min-h-screen p-4`}>
        <div className="flex flex-col h-full">
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold text-emerald-400">Fantasy Soccer</h1>
                <p className="text-gray-400 text-sm">
                  {isAdmin ? 'Tunisia Admin' : 'Tunisia'}
                </p>
              </div>
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-white focus:outline-none"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
          
          <nav className="space-y-2 flex-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-emerald-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                  onClick={onClose}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          
          <div className="mt-auto pt-4 border-t border-gray-800">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Horizontal Navbar */}
      <div className="hidden md:block bg-gray-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-emerald-400">Fantasy Soccer</h1>
              <p className="text-gray-400 text-xs">
                {isAdmin ? 'Tunisia Admin' : 'Tunisia'}
              </p>
            </div>
            
            {/* Navigation */}
            <nav className="flex space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={`flex items-center px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                      isActive
                        ? 'bg-emerald-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            
            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className="flex items-center px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors text-sm font-medium"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}