import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';

export default function WorkInProgress() {
  const { signOut } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Work in Progress</h1>
        <p className="text-gray-600 mb-6">
          This section is still under development. Please check back later!
        </p>
        <Button 
          onClick={signOut}
          className="w-full bg-red-600 hover:bg-red-700 text-white"
        >
          Log Out
        </Button>
      </div>
    </div>
  );
}
