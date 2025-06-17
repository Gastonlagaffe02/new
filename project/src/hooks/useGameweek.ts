import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Gameweek {
  gameweek_id: string;
  gameweek_number: number;
  name: string;
  deadline_time: string;
  start_time: string;
  end_time: string;
  is_current: boolean;
  is_next: boolean;
  is_finished: boolean;
}

interface GameweekStatus {
  current: Gameweek | null;
  next: Gameweek | null;
  transfersAllowed: boolean;
  timeUntilDeadline: number | null;
  timeUntilStart: number | null;
  timeUntilEnd: number | null;
  isGameweekActive: boolean;
}

export function useGameweek() {
  const [gameweekStatus, setGameweekStatus] = useState<GameweekStatus>({
    current: null,
    next: null,
    transfersAllowed: true,
    timeUntilDeadline: null,
    timeUntilStart: null,
    timeUntilEnd: null,
    isGameweekActive: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGameweekStatus();
    
    // Update every minute
    const interval = setInterval(fetchGameweekStatus, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchGameweekStatus = async () => {
    try {
      // Update gameweek status first
      await supabase.rpc('update_gameweek_status');
      
      // Fetch current and next gameweeks
      const { data: gameweeks, error } = await supabase
        .from('gameweeks')
        .select('*')
        .or('is_current.eq.true,is_next.eq.true')
        .order('gameweek_number');

      if (error) throw error;

      const current = gameweeks?.find(gw => gw.is_current) || null;
      const next = gameweeks?.find(gw => gw.is_next) || null;

      // Check if transfers are allowed
      const { data: transfersAllowed, error: transferError } = await supabase
        .rpc('transfers_allowed');

      if (transferError) throw transferError;

      const now = new Date();
      let timeUntilDeadline = null;
      let timeUntilStart = null;
      let timeUntilEnd = null;
      let isGameweekActive = false;

      const relevantGameweek = current || next;
      if (relevantGameweek) {
        const deadlineTime = new Date(relevantGameweek.deadline_time);
        const startTime = new Date(relevantGameweek.start_time);
        const endTime = new Date(relevantGameweek.end_time);

        timeUntilDeadline = deadlineTime.getTime() - now.getTime();
        timeUntilStart = startTime.getTime() - now.getTime();
        timeUntilEnd = endTime.getTime() - now.getTime();
        
        isGameweekActive = now >= startTime && now <= endTime;
      }

      setGameweekStatus({
        current,
        next,
        transfersAllowed: transfersAllowed || false,
        timeUntilDeadline: timeUntilDeadline > 0 ? timeUntilDeadline : null,
        timeUntilStart: timeUntilStart > 0 ? timeUntilStart : null,
        timeUntilEnd: timeUntilEnd > 0 ? timeUntilEnd : null,
        isGameweekActive,
      });
    } catch (error) {
      console.error('Error fetching gameweek status:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeRemaining = (milliseconds: number | null): string => {
    if (!milliseconds || milliseconds <= 0) return '';
    
    const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
    const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  return {
    gameweekStatus,
    loading,
    formatTimeRemaining,
    refreshStatus: fetchGameweekStatus,
  };
}