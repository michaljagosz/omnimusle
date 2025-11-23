'use client';

import { useEffect } from 'react';

/**
 * Wspólny typ statusu gry we wszystkich trybach.
 */
export type GameStatus = 'loading' | 'playing' | 'won' | 'lost';

/**
 * Jak wygląda stan gry zapisywany w localStorage.
 */
export type SavedDailyGameState<TGuess> = {
  targetId: number | string;
  guesses: TGuess[];
  round: number;
  gameStatus: GameStatus;
};

export interface UseDailyGamePersistenceParams<TTarget, TGuess> {
  storageKey: string;
  target: TTarget | null;
  getTargetId: (target: TTarget) => number | string;
  gameStatus: GameStatus;
  round: number;
  guesses: TGuess[];
  /**
   * Wywoływane, gdy znaleziono i prawidłowo dopasowano zapis stanu.
   */
  onRestore: (saved: SavedDailyGameState<TGuess>) => void;
  /**
   * Wywoływane, gdy NIE znaleziono pasującego zapisu (brak localStorage
   * albo inne targetId) albo wystąpił błąd podczas odczytu.
   * Dzięki temu nie musimy mieć osobnego „fallback” efektu.
   */
  onNoSavedState?: () => void;
}

/**
 * Wspólny hook do odczytu/zapisu stanu gry w localStorage.
 */
export function useDailyGamePersistence<TTarget, TGuess>(
  params: UseDailyGamePersistenceParams<TTarget, TGuess>
) {
  const {
    storageKey,
    target,
    getTargetId,
    gameStatus,
    round,
    guesses,
    onRestore,
    onNoSavedState,
  } = params;

  // 1) ODCZYT STANU PO ZAŁADOWANIU CELU
  useEffect(() => {
    if (!target) return;

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        onNoSavedState?.();
        return;
      }

      const parsed = JSON.parse(raw) as SavedDailyGameState<TGuess>;
      const currentId = getTargetId(target);

      if (parsed && parsed.targetId === currentId) {
        onRestore(parsed);
      } else {
        onNoSavedState?.();
      }
    } catch (error) {
      console.error('Failed to restore daily game state:', error);
      onNoSavedState?.();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  // 2) ZAPIS STANU PRZY ZMIANIE
  useEffect(() => {
    if (!target || gameStatus === 'loading') return;

    try {
      const stateToSave: SavedDailyGameState<TGuess> = {
        targetId: getTargetId(target),
        guesses,
        round,
        gameStatus,
      };
      localStorage.setItem(storageKey, JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Failed to save daily game state:', error);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, target, guesses, round, gameStatus]);
}