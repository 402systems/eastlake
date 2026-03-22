'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@402systems/lib-core-supabase-auth/web/hooks/useAuth';
import { useBingoBoard } from '../hooks/useBingoBoard';
import { useBingoBoardPersistence } from '../hooks/useBingoBoardPersistence';
import { useBoardExport } from '../hooks/useBoardExport';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { Header } from '../components/Header';
import { BoardControls } from '../components/BoardControls';
import { BingoGrid } from '../components/BingoGrid';

export default function BingoPage() {
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const [isPreview, setIsPreview] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  // Core board state and operations
  const { grid, setGrid, updateCell, shuffleBoard } = useBingoBoard();

  // Persistence
  const { saveBoard, isSaving, isLoadingBoard, saveStatus } =
    useBingoBoardPersistence({
      user,
      loading,
      grid,
      onBoardLoaded: setGrid,
    });

  // Auto-save on shuffle
  const handleShuffle = () => {
    shuffleBoard();
    if (user) {
      setTimeout(() => saveBoard(), 0);
    }
  };

  // Export functionality
  const { handleDownloadImage, handleShareImage } = useBoardExport(boardRef);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSave: saveBoard,
    onShuffle: handleShuffle,
    onTogglePreview: () => setIsPreview(!isPreview),
    isUserAuthenticated: !!user,
  });

  return (
    <div className="flex min-h-screen flex-col items-center gap-6 bg-slate-50 p-4 sm:gap-8 sm:p-8">
      <Header
        user={user}
        loading={loading}
        onSignIn={signIn}
        onSignUp={signUp}
        onSignOut={signOut}
      />

      <BoardControls
        isPreview={isPreview}
        isLoadingBoard={isLoadingBoard}
        isSaving={isSaving}
        saveStatus={saveStatus}
        isUserAuthenticated={!!user}
        isUserLoading={loading}
        onSetPreview={setIsPreview}
        onShuffle={handleShuffle}
        onSave={saveBoard}
        onDownloadImage={handleDownloadImage}
        onShareImage={handleShareImage}
        onPrint={() => window.print()}
      />

      <BingoGrid
        ref={boardRef}
        grid={grid}
        isPreview={isPreview}
        isLoadingBoard={isLoadingBoard}
        onUpdateCell={updateCell}
      />
    </div>
  );
}
