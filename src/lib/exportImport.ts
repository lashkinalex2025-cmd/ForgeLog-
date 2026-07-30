import { db, DEFAULT_SETTINGS } from '@/db'
import type {
  AppSettings,
  BodyWeight,
  Exercise,
  Food,
  Meal,
  Measurement,
  PersonalRecord,
  Recipe,
  Routine,
  WaterLog,
  Workout,
  WorkoutSet,
} from '@/types'

export interface ExportPayload {
  version: 1
  exportedAt: string
  settings: AppSettings[]
  foods: Food[]
  recipes: Recipe[]
  meals: Meal[]
  waterLogs: WaterLog[]
  exercises: Exercise[]
  routines: Routine[]
  workouts: Workout[]
  sets: WorkoutSet[]
  bodyWeight: BodyWeight[]
  measurements: Measurement[]
  personalRecords: PersonalRecord[]
  /** Photos as base64 data URLs when includePhotos */
  progressPhotos?: {
    id: string
    date: string
    side: string
    note?: string
    createdAt: number
    dataUrl: string
  }[]
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
  const binary = atob(data)
  const arr = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

export async function exportAllData(includePhotos = false): Promise<ExportPayload> {
  const [
    settings,
    foods,
    recipes,
    meals,
    waterLogs,
    exercises,
    routines,
    workouts,
    sets,
    bodyWeight,
    measurements,
    personalRecords,
    photos,
  ] = await Promise.all([
    db.settings.toArray(),
    db.foods.toArray(),
    db.recipes.toArray(),
    db.meals.toArray(),
    db.waterLogs.toArray(),
    db.exercises.toArray(),
    db.routines.toArray(),
    db.workouts.toArray(),
    db.sets.toArray(),
    db.bodyWeight.toArray(),
    db.measurements.toArray(),
    db.personalRecords.toArray(),
    includePhotos ? db.progressPhotos.toArray() : Promise.resolve([]),
  ])

  const payload: ExportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    foods,
    recipes,
    meals,
    waterLogs,
    exercises,
    routines,
    workouts,
    sets,
    bodyWeight,
    measurements,
    personalRecords,
  }

  if (includePhotos && photos.length) {
    payload.progressPhotos = await Promise.all(
      photos.map(async (p) => ({
        id: p.id,
        date: p.date,
        side: p.side,
        note: p.note,
        createdAt: p.createdAt,
        dataUrl: await blobToDataUrl(p.blob),
      }))
    )
  }

  return payload
}

export async function downloadExport(includePhotos = false): Promise<void> {
  const data = await exportAllData(includePhotos)
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `forgelog-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importAllData(
  payload: ExportPayload,
  mode: 'replace' | 'merge' = 'replace'
): Promise<void> {
  if (!payload || payload.version !== 1) {
    throw new Error('Invalid ForgeLog backup file')
  }

  await db.transaction(
    'rw',
    [
      db.settings,
      db.foods,
      db.recipes,
      db.meals,
      db.waterLogs,
      db.exercises,
      db.routines,
      db.workouts,
      db.sets,
      db.bodyWeight,
      db.measurements,
      db.progressPhotos,
      db.personalRecords,
    ],
    async () => {
      if (mode === 'replace') {
        await Promise.all([
          db.settings.clear(),
          db.foods.clear(),
          db.recipes.clear(),
          db.meals.clear(),
          db.waterLogs.clear(),
          db.exercises.clear(),
          db.routines.clear(),
          db.workouts.clear(),
          db.sets.clear(),
          db.bodyWeight.clear(),
          db.measurements.clear(),
          db.progressPhotos.clear(),
          db.personalRecords.clear(),
        ])
      }

      if (payload.settings?.length) await db.settings.bulkPut(payload.settings)
      else if (mode === 'replace') await db.settings.put(DEFAULT_SETTINGS)

      if (payload.foods?.length) await db.foods.bulkPut(payload.foods)
      if (payload.recipes?.length) await db.recipes.bulkPut(payload.recipes)
      if (payload.meals?.length) await db.meals.bulkPut(payload.meals)
      if (payload.waterLogs?.length) await db.waterLogs.bulkPut(payload.waterLogs)
      if (payload.exercises?.length) await db.exercises.bulkPut(payload.exercises)
      if (payload.routines?.length) await db.routines.bulkPut(payload.routines)
      if (payload.workouts?.length) await db.workouts.bulkPut(payload.workouts)
      if (payload.sets?.length) await db.sets.bulkPut(payload.sets)
      if (payload.bodyWeight?.length) await db.bodyWeight.bulkPut(payload.bodyWeight)
      if (payload.measurements?.length) await db.measurements.bulkPut(payload.measurements)
      if (payload.personalRecords?.length)
        await db.personalRecords.bulkPut(payload.personalRecords)

      if (payload.progressPhotos?.length) {
        await db.progressPhotos.bulkPut(
          payload.progressPhotos.map((p) => ({
            id: p.id,
            date: p.date,
            side: p.side as 'front' | 'side' | 'back',
            note: p.note,
            createdAt: p.createdAt,
            blob: dataUrlToBlob(p.dataUrl),
          }))
        )
      }
    }
  )
}

export async function clearAllUserData(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.settings,
      db.foods,
      db.recipes,
      db.meals,
      db.waterLogs,
      db.exercises,
      db.routines,
      db.workouts,
      db.sets,
      db.bodyWeight,
      db.measurements,
      db.progressPhotos,
      db.personalRecords,
    ],
    async () => {
      await Promise.all([
        db.settings.clear(),
        db.foods.clear(),
        db.recipes.clear(),
        db.meals.clear(),
        db.waterLogs.clear(),
        db.exercises.clear(),
        db.routines.clear(),
        db.workouts.clear(),
        db.sets.clear(),
        db.bodyWeight.clear(),
        db.measurements.clear(),
        db.progressPhotos.clear(),
        db.personalRecords.clear(),
      ])
      await db.settings.put({ ...DEFAULT_SETTINGS, onboardingDone: false })
    }
  )
}

export async function compressImage(
  file: File | Blob,
  maxEdge = 1200,
  quality = 0.82
): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  let { width, height } = bitmap
  if (width > maxEdge || height > maxEdge) {
    const scale = maxEdge / Math.max(width, height)
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('compress failed'))),
      'image/jpeg',
      quality
    )
  })
}
