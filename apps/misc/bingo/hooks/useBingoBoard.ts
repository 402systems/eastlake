import { useState, useCallback } from 'react';

export interface CellData {
  text: string;
  note: string;
}

export function useBingoBoard() {
  const [grid, setGrid] = useState<CellData[]>(
    Array(25)
      .fill(null)
      .map(() => ({ text: '', note: '' }))
  );

  const updateCell = useCallback((index: number, patch: Partial<CellData>) => {
    setGrid((prev) => {
      const newGrid = [...prev];
      newGrid[index] = { ...newGrid[index], ...patch };
      return newGrid;
    });
  }, []);

  const shuffleBoard = useCallback(() => {
    setGrid((prev) => {
      const shuffledGrid = [...prev];
      shuffledGrid.sort(() => Math.random() - 0.5);
      // Keep FREE SPACE at index 12
      const freeSpaceValue = prev[12];
      const newIndex = shuffledGrid.indexOf(freeSpaceValue);
      [shuffledGrid[newIndex], shuffledGrid[12]] = [
        shuffledGrid[12],
        shuffledGrid[newIndex],
      ];
      return shuffledGrid;
    });
  }, []);

  return {
    grid,
    setGrid,
    updateCell,
    shuffleBoard,
  };
}
