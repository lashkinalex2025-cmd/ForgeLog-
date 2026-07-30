import Dexie, { type EntityTable } from 'dexie'
import type {
  AppSettings,
  BodyWeight,
  Exercise,
  Food,
  Meal,
  Measurement,
  PersonalRecord,
  ProgressPhoto,
  Recipe,
  Routine,
  WaterLog,
  Workout,
  WorkoutSet,
} from '@/types'

export class ForgeLogDB extends Dexie {
  settings!: EntityTable<AppSettings, 'id'>
  foods!: EntityTable<Food, 'id'>
  recipes!: EntityTable<Recipe, 'id'>
  meals!: EntityTable<Meal, 'id'>
  waterLogs!: EntityTable<WaterLog, 'id'>
  exercises!: EntityTable<Exercise, 'id'>
  routines!: EntityTable<Routine, 'id'>
  workouts!: EntityTable<Workout, 'id'>
  sets!: EntityTable<WorkoutSet, 'id'>
  bodyWeight!: EntityTable<BodyWeight, 'id'>
  measurements!: EntityTable<Measurement, 'id'>
  progressPhotos!: EntityTable<ProgressPhoto, 'id'>
  personalRecords!: EntityTable<PersonalRecord, 'id'>

  constructor() {
    super('ForgeLogDB')
    this.version(1).stores({
      settings: 'id',
      foods: 'id, name, nameEn, barcode, isCustom',
      recipes: 'id, name, createdAt',
      meals: 'id, date, type, createdAt',
      waterLogs: 'id, date, createdAt',
      exercises: 'id, name, nameEn, primaryMuscle, equipment, isCustom',
      routines: 'id, name, template, createdAt',
      workouts: 'id, date, status, routineId, startedAt',
      sets: 'id, workoutId, exerciseId, setIndex, completedAt',
      bodyWeight: 'id, date, createdAt',
      measurements: 'id, date, createdAt',
      progressPhotos: 'id, date, side, createdAt',
      personalRecords: 'id, exerciseId, type, date, createdAt',
    })
    // Compound index for efficient per-exercise set lookups within a workout
    this.version(2).stores({
      sets: 'id, workoutId, exerciseId, setIndex, completedAt, [workoutId+exerciseId]',
    })
  }
}

export const db = new ForgeLogDB()

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'main',
  theme: 'dark',
  locale: 'ru',
  weightUnit: 'kg',
  lengthUnit: 'cm',
  phase: 'maintain',
  goals: {
    kcal: 2500,
    protein: 180,
    fat: 70,
    carbs: 280,
    fiber: 30,
    waterMl: 3000,
  },
  profile: {
    name: '',
    sex: 'male',
    age: 25,
    heightCm: 175,
    activity: 'moderate',
  },
  restTimerDefault: 90,
  weightIncrement: 2.5,
  onboardingDone: false,
  favoriteFoodIds: [],
}
