import { useCallback } from 'react';
import { toPng, toBlob } from 'html-to-image';

export function useBoardExport(boardRef: React.RefObject<HTMLDivElement>) {
  const handleDownloadImage = useCallback(async () => {
    if (!boardRef.current) return;
    try {
      const dataUrl = await toPng(boardRef.current, {
        backgroundColor: '#f8fafc',
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = `bingo-board-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download image', err);
    }
  }, [boardRef]);

  const handleShareImage = useCallback(async () => {
    if (!boardRef.current) return;
    try {
      const blob = await toBlob(boardRef.current, {
        backgroundColor: '#f8fafc',
        cacheBust: true,
      });
      if (!blob) return;

      const file = new File([blob], 'bingo-board.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My Bingo Board',
          text: 'Check out my custom bingo board!',
        });
      } else {
        // Fallback for browsers that don't support file sharing
        handleDownloadImage();
      }
    } catch (err) {
      console.error('Failed to share image', err);
    }
  }, [boardRef, handleDownloadImage]);

  return {
    handleDownloadImage,
    handleShareImage,
  };
}
