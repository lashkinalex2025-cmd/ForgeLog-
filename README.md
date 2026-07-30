# ForgeLog

**ForgeLog** — offline-first Progressive Web App для учёта питания и тренировок, заточенный под бодибилдинг и силовой фитнес.

Все данные хранятся **локально** в IndexedDB (Dexie). Нет аккаунтов, бэкенда, аналитики и внешних API.

![License](https://img.shields.io/badge/license-MIT-green)
![PWA](https://img.shields.io/badge/PWA-ready-emerald)
![Stack](https://img.shields.io/badge/React-Vite-TypeScript-blue)

## Возможности

### Питание
- Дневник приёмов пищи, быстрый поиск продуктов (локальная база ~100+)
- Свои продукты, штрих-код (BarcodeDetector / ручной ввод)
- Цели по ккал и БЖУ, калькулятор по Mifflin–St Jeor
- Адаптивные рекомендации калорий (MacroFactor-lite) по тренду веса
- Вода, история и графики

### Тренировки
- Библиотека ~160+ упражнений с группами мышц
- Программы: PPL, Upper/Lower, Push/Pull, Full Body
- Логгинг одной рукой: вес × повторы × RPE, таймер отдыха
- Progressive Overload подсказки и личные рекорды (PR)
- Объём тренировки и heatmap по мышечным группам

### Прогресс тела
- Вес, обхваты, фото с side-by-side сравнением
- Примерный % жира (формула US Navy)
- Графики трендов

### Данные и PWA
- Полный экспорт / импорт JSON (включая фото)
- Установка на Android / iOS (Add to Home Screen)
- Тёмная тема по умолчанию, светлая и системная
- Русский и English

## Стек

| | |
|---|---|
| UI | React 18+, TypeScript, Vite, Tailwind CSS, shadcn-style components |
| State / DB | Zustand, Dexie.js (IndexedDB) |
| PWA | vite-plugin-pwa + Workbox |
| Charts | Recharts |
| Icons | Lucide React |
| Router | React Router |
| Dates | date-fns |
| Tests | Vitest |

## Требования

- Node.js **18+** (рекомендуется 20+)
- npm 9+

## Быстрый старт

```bash
# клонировать / открыть папку проекта
cd Dnevnik

npm install
npm run dev
```

Откройте [http://localhost:5173](http://localhost:5173).

### Скрипты

| Команда | Описание |
|---------|----------|
| `npm run dev` | Dev-сервер |
| `npm run build` | Production-сборка в `dist/` |
| `npm run preview` | Превью production-сборки |
| `npm test` | Unit-тесты (Vitest) |

## Сборка

```bash
npm run build
```

Артефакты: `dist/` (HTML/JS/CSS + service worker + manifest).

## Деплой

Приложение полностью статическое — подходит любой static host.

### Vercel

```bash
npm i -g vercel
vercel
```

Или через GitHub: import project → Framework: Vite → Build `npm run build` → Output `dist`.

### Netlify

```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

`netlify.toml` (опционально):

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### GitHub Pages

1. В `vite.config.ts` задайте `base: '/REPO_NAME/'` если репозиторий не user-site.
2. Соберите: `npm run build`
3. Залейте содержимое `dist/` в ветку `gh-pages` или используйте GitHub Actions:

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

> **Важно:** HTTPS обязателен для Service Worker и камеры (штрих-код).

## Установка как PWA

- **Android / Chrome / Edge:** меню → «Установить приложение» / «Добавить на главный экран»
- **iOS Safari:** Поделиться → «На экран „Домой“»

После установки приложение работает offline: shell кэшируется SW, данные — в IndexedDB.

## Структура проекта

```
src/
  components/   # UI, layout, domain widgets
  pages/        # маршруты
  stores/       # Zustand
  db/           # Dexie schema + seed
  lib/          # calc, i18n, units, export/import
  types/        # TypeScript модели
  hooks/
```

## Конфиденциальность

- Нет телеметрии и сторонних запросов (кроме опционального доступа к камере в браузере)
- Резервные копии — только вручную через JSON export

## Лицензия

[MIT](./LICENSE)

---

Сделано для атлетов, которым нужен быстрый лог в зале и полный контроль данных.
