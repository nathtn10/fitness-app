/**
 * Nutrition state: logged meals and daily goals, in its own provider.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  loadMeals,
  loadNutritionGoals,
  saveMeals,
  saveNutritionGoals,
} from '../data/nutritionRepository';
import {
  DEFAULT_NUTRITION_GOALS,
  type NutritionGoals,
} from '../domain/nutrition/goals';
import type { Meal } from '../domain/nutrition/types';

interface NutritionStoreValue {
  loading: boolean;
  meals: Meal[];
  goals: NutritionGoals;

  saveMeal: (meal: Meal) => void;
  deleteMeal: (mealId: string) => void;
  updateGoals: (patch: Partial<NutritionGoals>) => void;
}

const NutritionContext = createContext<NutritionStoreValue | null>(null);

export function NutritionProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [goals, setGoals] = useState<NutritionGoals>(DEFAULT_NUTRITION_GOALS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [m, g] = await Promise.all([loadMeals(), loadNutritionGoals()]);
      if (cancelled) return;
      setMeals(m);
      setGoals(g);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Insert a new meal or replace an existing one with the same id. */
  const saveMeal = useCallback((meal: Meal) => {
    setMeals((prev) => {
      const idx = prev.findIndex((m) => m.id === meal.id);
      const next = idx === -1 ? [meal, ...prev] : prev.map((m) => (m.id === meal.id ? meal : m));
      void saveMeals(next);
      return next;
    });
  }, []);

  const deleteMeal = useCallback((mealId: string) => {
    setMeals((prev) => {
      const next = prev.filter((m) => m.id !== mealId);
      void saveMeals(next);
      return next;
    });
  }, []);

  const updateGoals = useCallback((patch: Partial<NutritionGoals>) => {
    setGoals((prev) => {
      const next = { ...prev, ...patch };
      void saveNutritionGoals(next);
      return next;
    });
  }, []);

  const value = useMemo<NutritionStoreValue>(
    () => ({ loading, meals, goals, saveMeal, deleteMeal, updateGoals }),
    [loading, meals, goals, saveMeal, deleteMeal, updateGoals],
  );

  return (
    <NutritionContext.Provider value={value}>
      {children}
    </NutritionContext.Provider>
  );
}

export function useNutrition(): NutritionStoreValue {
  const ctx = useContext(NutritionContext);
  if (!ctx) throw new Error('useNutrition must be used within a NutritionProvider');
  return ctx;
}
