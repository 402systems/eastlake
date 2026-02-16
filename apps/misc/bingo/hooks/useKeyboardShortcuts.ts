import { useEffect } from 'react';

interface UseKeyboardShortcutsProps {
  onSave: () => void;
  onShuffle: () => void;
  onTogglePreview: () => void;
  isUserAuthenticated: boolean;
}

export function useKeyboardShortcuts({
  onSave,
  onShuffle,
  onTogglePreview,
  isUserAuthenticated,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if key exists and get lowercase version
      const key = e.key?.toLowerCase();
      if (!key) return;

      // Use Cmd on Mac, Ctrl on Windows/Linux
      const modifierKey = e.metaKey || e.ctrlKey;

      if (key === 's' && modifierKey) {
        e.preventDefault();
        if (e.shiftKey) {
          // Cmd/Ctrl+Shift+S = Shuffle
          onShuffle();
        } else {
          // Cmd/Ctrl+S = Save
          if (isUserAuthenticated) onSave();
        }
      }
      if (key === 'p' && modifierKey) {
        e.preventDefault();
        onTogglePreview();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave, onShuffle, onTogglePreview, isUserAuthenticated]);
}
