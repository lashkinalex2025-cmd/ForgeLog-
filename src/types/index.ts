export type Locale = 'ru' | 'en'
export type ThemeMode = 'dark' | 'light' | 'system'
export type WeightUnit = 'kg' | 'lb'
export type LengthUnit = 'cm' | 'in'
export type Phase = 'bulk' | 'cut' | 'maintain'
export type Sex = 'male' | 'female' | 'other'
export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'forearms'
  | 'traps'
  | 'full_body'

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'machine'
  | 'bodyweight'
  | 'kettlebell'
  | 'band'
  | 'other'

export type WorkoutStatus = 'planned' | 'active' | 'done'
export type PhotoSide = 'front' | 'side' | 'back'
export type PRType = 'weight' | 'volume' | 'reps'
export type RoutineTemplate =
  | 'ppl'
  | 'upper_lower'
  | 'push_pull'
  | 'full_body'
  | 'custom'

export interface Macros {
  kcal: number
  protein: number
  fat: number
  carbs: number
  fiber?: number
}

export interface MacroGoals extends Macros {
  waterMl: number
}

export interface Profile {
  name: string
  sex: Sex
  age: number
  heightCm: number
  activity: ActivityLevel
}

export interface AppSettings {
  id: string
  theme: ThemeMode
  locale: Locale
  weightUnit: WeightUnit
  lengthUnit: LengthUnit
  phase: Phase
  goals: MacroGoals
  profile: Profile
  restTimerDefault: number
  weightIncrement: number
  onboardingDone: boolean
  favoriteFoodIds: string[]
  /** Applied built-in catalog version; bump to re-seed foods/exercises for existing users */
  seedVersion?: number
}

export interface Food {
  id: string
  name: string
  nameEn: string
  brand?: string
  barcode?: string
  per100g: Macros
  isCustom: boolean
  createdAt: number
}

export interface RecipeIngredient {
  foodId: string
  grams: number
}

export interface Recipe {
  id: string
  name: string
  ingredients: RecipeIngredient[]
  servings: number
  notes?: string
  createdAt: number
}

export interface MealItem {
  id: string
  foodId?: string
  recipeId?: string
  name: string
  grams: number
  macros: Macros
}

export interface Meal {
  id: string
  date: string
  type: MealType
  items: MealItem[]
  totals: Macros
  createdAt: number
}

export interface WaterLog {
  id: string
  date: string
  ml: number
  createdAt: number
}

export interface Exercise {
  id: string
  name: string
  nameEn: string
  primaryMuscle: MuscleGroup
  secondaryMuscles: MuscleGroup[]
  equipment: Equipment
  isCustom: boolean
  instructions?: string
}

export interface RoutineDay {
  name: string
  exerciseIds: string[]
}

export interface Routine {
  id: string
  name: string
  template: RoutineTemplate
  days: RoutineDay[]
  createdAt: number
}

export interface Workout {
  id: string
  date: string
  routineId?: string
  name: string
  startedAt?: number
  finishedAt?: number
  notes?: string
  status: WorkoutStatus
}

export interface WorkoutSet {
  id: string
  workoutId: string
  exerciseId: string
  setIndex: number
  weight: number
  reps: number
  rpe?: number
  rir?: number
  isWarmup: boolean
  completedAt?: number
}

export interface BodyWeight {
  id: string
  date: string
  weightKg: number
  note?: string
  createdAt: number
}

export interface Measurement {
  id: string
  date: string
  chest?: number
  waist?: number
  hips?: number
  arms?: number
  thighs?: number
  neck?: number
  calves?: number
  createdAt: number
}

export interface ProgressPhoto {
  id: string
  date: string
  side: PhotoSide
  blob: Blob
  note?: string
  createdAt: number
}

export interface PersonalRecord {
  id: string
  exerciseId: string
  type: PRType
  value: number
  date: string
  setId?: string
  createdAt: number
}

export interface DayNutritionTotals extends Macros {
  waterMl: number
}

export interface AdaptiveSuggestion {
  suggestedKcal: number
  delta: number
  reason: string
  reasonEn: string
  confidence: 'low' | 'medium' | 'high'
}

export interface OverloadSuggestion {
  weight: number
  reps: number
  reason: string
  reasonEn: string
}

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'forearms',
  'traps',
]

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
