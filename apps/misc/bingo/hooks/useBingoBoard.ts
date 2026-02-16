import { useState, useCallback } from 'react';

export function useBingoBoard() {
  const [grid, setGrid] = useState<string[]>(Array(25).fill(''));

  const updateCell = useCallback(
    (index: number, value: string) => {
      const newGrid = [...grid];
      newGrid[index] = value;
      setGrid(newGrid);
    },
    [grid]
  );

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

  return {
    grid,
    setGrid,
    updateCell,
    shuffleBoard,
  };
}
