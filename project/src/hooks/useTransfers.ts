import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface TransferData {
  transfersRemaining: number;
  transfersMadeThisGW: number;
  transfersBanked: number;
  maxTransfers: number;
  canMakeTransfers: boolean;
}

export function useTransfers(fantasyTeamId?: string) {
  const { user } = useAuth();
  const [transferData, setTransferData] = useState<TransferData>({
    transfersRemaining: 1,
    transfersMadeThisGW: 0,
    transfersBanked: 0,
    maxTransfers: 2,
    canMakeTransfers: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (fantasyTeamId) {
      fetchTransferData();
    }
  }, [fantasyTeamId]);

  const fetchTransferData = async () => {
    if (!fantasyTeamId) return;

    try {
      // Get team transfer data
      const { data: team, error } = await supabase
        .from('fantasy_teams')
        .select('transfers_made_this_gw, transfers_banked, current_gameweek')
        .eq('fantasy_team_id', fantasyTeamId)
        .single();

      if (error) throw error;

      // Check if transfers are allowed
      const { data: transfersAllowed, error: transferError } = await supabase
        .rpc('transfers_allowed');

      if (transferError) throw transferError;

      const transfersMadeThisGW = team.transfers_made_this_gw || 0;
      const transfersBanked = team.transfers_banked || 0;
      
      // Calculate available transfers
      // Base: 1 transfer per gameweek + banked transfers (max 2 total)
      const baseTransfers = 1;
      const totalAvailable = Math.min(baseTransfers + transfersBanked, 2);
      const transfersRemaining = Math.max(totalAvailable - transfersMadeThisGW, 0);

      setTransferData({
        transfersRemaining,
        transfersMadeThisGW,
        transfersBanked,
        maxTransfers: 2,
        canMakeTransfers: transfersAllowed && transfersRemaining > 0,
      });
    } catch (error) {
      console.error('Error fetching transfer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const makeTransfer = async (outgoingPlayerId: string, incomingPlayerId: string, rosterId: string) => {
    if (!fantasyTeamId || transferData.transfersRemaining <= 0) {
      toast.error('No transfers remaining');
      return false;
    }

    if (!transferData.canMakeTransfers) {
      toast.error('Transfers are not allowed at this time');
      return false;
    }

    try {
      // Get team data
      const { data: team, error: teamError } = await supabase
        .from('fantasy_teams')
        .select('*')
        .eq('fantasy_team_id', fantasyTeamId)
        .single();

      if (teamError) throw teamError;

      // Get player prices
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('player_id, price')
        .in('player_id', [outgoingPlayerId, incomingPlayerId]);

      if (playersError) throw playersError;

      const outgoingPlayer = players.find(p => p.player_id === outgoingPlayerId);
      const incomingPlayer = players.find(p => p.player_id === incomingPlayerId);

      if (!outgoingPlayer || !incomingPlayer) {
        throw new Error('Player not found');
      }

      const priceDifference = incomingPlayer.price - outgoingPlayer.price;
      const newBudget = team.budget_remaining - priceDifference;

      if (newBudget < 0) {
        toast.error('Insufficient budget for this transfer');
        return false;
      }

      // Update roster
      const { error: rosterError } = await supabase
        .from('rosters')
        .update({ 
          player_id: incomingPlayerId,
          purchase_price: incomingPlayer.price 
        })
        .eq('roster_id', rosterId);

      if (rosterError) throw rosterError;

      // Update fantasy team
      const newTransfersMade = transferData.transfersMadeThisGW + 1;
      const { error: teamUpdateError } = await supabase
        .from('fantasy_teams')
        .update({
          budget_remaining: newBudget,
          transfers_made_this_gw: newTransfersMade,
        })
        .eq('fantasy_team_id', fantasyTeamId);

      if (teamUpdateError) throw teamUpdateError;

      // Record transactions
      const transactions = [
        {
          fantasy_team_id: fantasyTeamId,
          player_id: outgoingPlayerId,
          transaction_type: 'transfer_out' as const,
          gameweek: team.current_gameweek || 1,
          price: outgoingPlayer.price,
          transfer_cost: 0,
        },
        {
          fantasy_team_id: fantasyTeamId,
          player_id: incomingPlayerId,
          transaction_type: 'transfer_in' as const,
          gameweek: team.current_gameweek || 1,
          price: incomingPlayer.price,
          transfer_cost: 0,
        },
      ];

      const { error: transactionError } = await supabase
        .from('transactions')
        .insert(transactions);

      if (transactionError) throw transactionError;

      toast.success(`Transfer completed: ${outgoingPlayer.name} → ${incomingPlayer.name}`);
      
      // Refresh transfer data
      await fetchTransferData();
      
      return true;
    } catch (error) {
      console.error('Error making transfer:', error);
      toast.error('Failed to complete transfer');
      return false;
    }
  };

  return {
    transferData,
    loading,
    makeTransfer,
    refreshTransferData: fetchTransferData,
  };
}