import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@402systems/lib-core-supabase-auth/client';
import type { User } from '@supabase/supabase-js';

interface UseBingoBoardPersistenceProps {
  user: User | null;
  loading: boolean;
  grid: string[];
  onBoardLoaded: (grid: string[]) => void;
}

export function useBingoBoardPersistence({
  user,
  loading,
  grid,
  onBoardLoaded,
}: UseBingoBoardPersistenceProps) {
  const [supabase, setSupabase] = useState<ReturnType<
    typeof createClient
  > | null>(null);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingBoard, setIsLoadingBoard] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');

  // Initialize Supabase client on mount (client-side only)
  useEffect(() => {
    setSupabase(createClient());
  }, []);

  const loadBoard = useCallback(async () => {
    if (!user?.id || !supabase) return;

    setIsLoadingBoard(true);
    try {
      const { data, error } = await supabase
        .from('bingo_boards')
        .select('id, title, grid_data')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No saved board found - this is okay, user starts fresh
          console.log('No saved board found, starting fresh');
          return;
        }
        throw error;
      }

      if (data) {
        setBoardId(data.id);
        onBoardLoaded(data.grid_data);
      }
    } catch (error) {
      console.error('Failed to load board:', error);
    } finally {
      setIsLoadingBoard(false);
    }
  }, [user, supabase, onBoardLoaded]);

  const saveBoard = useCallback(async () => {
    if (!user?.id || isSaving || !supabase) return;

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      if (boardId) {
        // Update existing board
        const { error } = await supabase
          .from('bingo_boards')
          .update({
            grid_data: grid,
            title: 'My Bingo Board',
          })
          .eq('id', boardId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Insert new board
        const { data, error } = await supabase
          .from('bingo_boards')
          .insert({
            user_id: user.id,
            title: 'My Bingo Board',
            grid_data: grid,
          })
          .select('id')
          .single();

        if (error) throw error;
        if (data) setBoardId(data.id);
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save board:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  }, [user, boardId, grid, isSaving, supabase]);

  // Load board when user authenticates
  useEffect(() => {
    if (user && !loading) {
      loadBoard();
    }
  }, [user, loading, loadBoard]);

  return {
    saveBoard,
    isSaving,
    isLoadingBoard,
    saveStatus,
  };
}
