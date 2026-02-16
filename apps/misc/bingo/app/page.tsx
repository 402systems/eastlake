'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toPng, toBlob } from 'html-to-image';
import { Button } from '@402systems/core-ui/components/ui/button';
import { Card } from '@402systems/core-ui/components/ui/card';
import { Textarea } from '@402systems/core-ui/components/ui/textarea';
import { Kbd } from '@402systems/core-ui/components/ui/kbd';
import { Download, Share2, Printer, User, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '@402systems/lib-core-supabase-auth/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@402systems/core-ui/components/ui/dropdown-menu';

export default function BingoPage() {
  const { user, loading, signOut } = useAuth();
  const [grid, setGrid] = useState<string[]>(Array(25).fill(''));
  const [isPreview, setIsPreview] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  const updateCell = (index: number, value: string) => {
    const newGrid = [...grid];
    newGrid[index] = value;
    setGrid(newGrid);
  };

  const shuffleBoard = useCallback(() => {
    const shuffledGrid = [...grid];
    shuffledGrid.sort(() => Math.random() - 0.5);
    // Keep FREE SPACE at index 12
    const freeSpaceValue = grid[12];
    const newIndex = shuffledGrid.indexOf(freeSpaceValue);
    [shuffledGrid[newIndex], shuffledGrid[12]] = [
      shuffledGrid[12],
      shuffledGrid[newIndex],
    ];
    setGrid(shuffledGrid);
  }, [grid]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 's' && e.ctrlKey) {
        e.preventDefault();
        shuffleBoard();
      }
      if (e.key.toLowerCase() === 'p' && e.ctrlKey) {
        e.preventDefault();
        setIsPreview(!isPreview);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shuffleBoard, isPreview]);

  const handleDownloadImage = async () => {
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
  };

  const handleShareImage = async () => {
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
  };

  return (
    <div className="flex min-h-screen flex-col items-center gap-6 bg-slate-50 p-4 sm:gap-8 sm:p-8">
      <div className="w-full max-w-5xl">
        <div className="flex items-center justify-between">
          <div className="space-y-2 text-center flex-1">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">
              Bingo Builder
            </h1>
            <p className="text-slate-500">Create your custom 5x5 bingo board</p>
          </div>
          <div>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <User className="h-4 w-4" />
                    {user.email?.split('@')[0]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="gap-2">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" asChild>
                <a href="/">Sign In</a>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            variant={isPreview ? 'outline' : 'default'}
            onClick={() => setIsPreview(false)}
            className="relative"
          >
            Edit Board
          </Button>
          <Button
            variant={isPreview ? 'default' : 'outline'}
            onClick={() => setIsPreview(true)}
          >
            Preview <Kbd className="ml-2">Ctrl+P</Kbd>
          </Button>
          <Button variant={'outline'} onClick={shuffleBoard}>
            Shuffle <Kbd className="ml-2">Ctrl+S</Kbd>
          </Button>
        </div>
      </div>

      <Card
        ref={boardRef}
        className="w-full max-w-2xl border-slate-200 bg-white p-3 shadow-xl sm:p-6"
      >
        <div className="grid w-full grid-cols-5 gap-2 sm:gap-3">
          {grid.map((cell, i) => (
            <div key={i} className="aspect-square w-full">
              {isPreview ? (
                <div className="group relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-slate-100 bg-slate-50 p-1 text-center text-[10px] font-medium text-slate-700 sm:p-2 sm:text-sm">
                  <span className="max-w-full break-words">
                    {cell || (i === 12 ? 'FREE' : '-')}
                  </span>
                </div>
              ) : (
                <Textarea
                  className="h-full min-h-0 w-full resize-none p-1 text-center text-[10px] sm:p-2 sm:text-sm"
                  value={cell}
                  onChange={(e) => updateCell(i, e.target.value)}
                  placeholder={i === 12 ? 'FREE' : `${i + 1}`}
                />
              )}
            </div>
          ))}
        </div>
      </Card>

      {isPreview && (
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={handleDownloadImage} variant="secondary" size="lg">
            <Download className="mr-2 h-4 w-4" /> Download PNG
          </Button>
          <Button onClick={handleShareImage} variant="secondary" size="lg">
            <Share2 className="mr-2 h-4 w-4" /> Share Board
          </Button>
          <Button onClick={() => window.print()} variant="outline" size="lg">
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </div>
      )}
    </div>
  );
}
