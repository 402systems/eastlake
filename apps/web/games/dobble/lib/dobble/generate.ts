import type { DobbleCard, DobbleSymbol } from './types';

const SCALE_MIN = 0.8;
const SCALE_MAX = 2.5;

const MIN_DISTANCE_BETWEEN_SYMBOLS = 22; // Adjust this to tune density
const MAX_PLACEMENT_ATTEMPTS = 50; // Safety break to prevent infinite loops

const generateValidPosition = (
  index: number,
  totalOnCard: number,
  existingSymbols: DobbleSymbol[]
): { x: number; y: number } => {
  let attempts = 0;

  while (attempts < MAX_PLACEMENT_ATTEMPTS) {
    // 1. Generate a candidate position
    const angle = (index / totalOnCard) * 2 * Math.PI + Math.random() * 0.5;
    const maxRadius = 38;
    const distance = Math.sqrt(Math.random()) * maxRadius;

    const candidateX = Math.cos(angle) * distance;
    const candidateY = Math.sin(angle) * distance;

    // 2. Check against all symbols already on this specific card
    const isOverlapping = existingSymbols.some((other) => {
      const dx = candidateX - other.x;
      const dy = candidateY - other.y;
      const actualDistance = Math.sqrt(dx * dx + dy * dy);

      // Collision threshold:
      // You can even make this dynamic based on symbol.scale
      return actualDistance < MIN_DISTANCE_BETWEEN_SYMBOLS;
    });

    if (!isOverlapping) {
      return { x: candidateX, y: candidateY };
    }

    attempts++;
  }

  // Fallback: If it couldn't find a perfect spot, return the last candidate
  // (Or you can reduce MIN_DISTANCE_BETWEEN_SYMBOLS)
  return { x: 0, y: 0 };
};

/**
 * Pre-computes all visual metadata for a symbol instance on a specific card.
 * Uses index to help distribute symbols across the circle.
 */
const generateVisuals = (
  index: number,
  totalOnCard: number
): Partial<DobbleSymbol> => {
  // 1. Rotation and Scale
  const rotation = Math.floor(Math.random() * 360);
  const scale = (Math.random() * (SCALE_MAX - SCALE_MIN) + SCALE_MIN).toFixed(
    2
  );

  // 2. Position (Polar Coordinates to Cartesian)
  // We use the index to ensure symbols aren't all in the same quadrant
  const angle = (index / totalOnCard) * 2 * Math.PI + Math.random() * 0.5;

  // Square root distribution prevents clustering in the center
  // Distance is a percentage of the card's radius (0 to 80% to leave a margin)
  const maxRadius = 38;
  const distance = Math.sqrt(Math.random()) * maxRadius;

  const x = Math.cos(angle) * distance;
  const y = Math.sin(angle) * distance;

  return { rotation, scale, x, y };
};

export function generateDobbleDeck(n: number): DobbleCard[] {
  if (n <= 0) {
    throw new Error('n must be a positive integer.');
  }
  // For now, we only support prime n.
  // Implementing Galois Field arithmetic for prime power n (e.g., n=4, 8, 9)
  // is more complex and will be addressed if explicitly required.
  if (!isPrime(n)) {
    throw new Error('Currently, n must be a prime number.');
  }

  const deck: DobbleCard[] = [];

  // Helper for modular arithmetic (GF(n))
  const mod = (val: number, m: number) => ((val % m) + m) % m;

  // Helper to add metadata to a basic ID
  const createSymbol = (
    id: number,
    index: number,
    currentCardSymbols: DobbleSymbol[]
  ): DobbleSymbol => {
    const visuals = generateVisuals(index, n + 1);
    const pos = generateValidPosition(index, n + 1, currentCardSymbols);
    return {
      id,
      rotation: visuals.rotation!,
      scale: visuals.scale!,
      x: pos.x!,
      y: pos.y!,
    };
  };

  // --- Points (Symbols) Mapping ---
  // Total symbols are n*n + n + 1. We'll use 0-indexed IDs.
  // 1. Affine Points (x, y) where x, y in GF(n)
  //    Map (x, y) to symbol ID: y * n + x
  //    IDs: 0 to n*n - 1
  // 2. Points at Infinity (m) where m in GF(n) (for slopes)
  //    Map (m) to symbol ID: n*n + m
  //    IDs: n*n to n*n + n - 1
  // 3. Point at Infinity (inf) (for vertical lines)
  //    Map (inf) to symbol ID: n*n + n
  //    ID: n*n + n

  // --- Lines (Cards) Construction ---

  // Type 1: Affine Lines (y = mx + c)
  // For each m, c in GF(n)
  for (let m = 0; m < n; m++) {
    for (let c = 0; c < n; c++) {
      const symbols: DobbleSymbol[] = [];
      // Add n points (x, mx + c)
      for (let x = 0; x < n; x++) {
        const y = mod(m * x + c, n);
        symbols.push(createSymbol(y * n + x, symbols.length, symbols));
      }

      // Add point at infinity (m)
      symbols.push(createSymbol(n * n + m, symbols.length, symbols));
      deck.push({
        symbols,
      });
    }
  }

  // Type 2: Affine Lines (x = k) - Vertical Lines
  // For each k in GF(n)
  for (let k = 0; k < n; k++) {
    const symbols: DobbleSymbol[] = [];
    // Add n points (k, y)
    for (let y = 0; y < n; y++) {
      symbols.push(createSymbol(y * n + k, symbols.length, symbols));
    }
    // Add point at infinity (inf)
    symbols.push(createSymbol(n * n + n, symbols.length, symbols));
    deck.push({
      symbols,
    });
  }

  // Type 3: Line at Infinity
  // Contains all n points at infinity (m) and the point at infinity (inf)
  const symbols: DobbleSymbol[] = [];
  for (let m = 0; m < n; m++) {
    // Point at infinity for slope m
    symbols.push(createSymbol(n * n + m, symbols.length, symbols));
  }
  // Point at infinity for vertical lines
  symbols.push(createSymbol(n * n + n, symbols.length, symbols));
  deck.push({
    symbols,
  });

  return deck;
}

// Helper function to check if a number is prime
function isPrime(num: number): boolean {
  if (num <= 1) return false;
  for (let i = 2, s = Math.sqrt(num); i <= s; i++) {
    if (num % i === 0) return false;
  }
  return true;
}
