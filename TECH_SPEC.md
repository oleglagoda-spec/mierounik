# TECH SPEC: Creative A/B Test Studio

## 1. Product Goal

Создать desktop-инструмент для легальной подготовки видеокреативов и A/B тестов:
- генерация набора вариаций из одного исходника,
- контроль диапазонов параметров,
- воспроизводимость результатов (seed),
- прозрачный audit trail (sidecar JSON + hash).

## 2. Compliance Boundaries

Разрешено:
- техническая нормализация видео для тестов,
- controlled randomization параметров,
- сравнение performance креативов.

Запрещено:
- обход модерации,
- обход anti-spam / anti-fraud,
- обход copyright/Content ID,
- маскировка происхождения контента под ложные устройства/события.

## 3. End-to-End Pipeline

1. Ingest
- Выбор source video.
- Выбор output directory.
- ffprobe preflight: длительность, потоки, размеры.

2. Blueprint Generation
- На вход: диапазоны параметров + `count` + optional `seed`.
- На выход: `N` variant blueprints.
- Каждый blueprint содержит:
  - уникальный `id`,
  - `index`,
  - `blueprintSeed`,
  - выбранные `adjustments`,
  - выбранный `bitrateKbps`,
  - `outputPath`, `sidecarPath`.

3. Render Queue
- Очередь задач (`jobQueue`).
- Для каждого blueprint:
  - build ffmpeg command,
  - render,
  - hash output,
  - write sidecar JSON,
  - publish progress/log events.
- Поддержка cancel для active/pending задач.

4. Output + Audit
- Output files (`.mp4`).
- Sidecar JSON per output.
- SHA256 per file.

## 4. Module Contracts

### `src/lib/jobs/blueprintGenerator.ts`
- Отвечает только за генерацию blueprint’ов.
- Deterministic mode при fixed seed.
- Range normalization (`min`/`max`) и safe clamping.

### `src/lib/ffmpeg/commandBuilder.ts`
- Преобразует blueprint -> ffmpeg args.
- Не генерирует случайные числа.
- Поддерживает bitrate controls (`-b:v`, `-maxrate`, `-bufsize`).

### `src/lib/jobs/jobQueue.ts`
- Последовательная обработка задач.
- Cancel active task и purge pending by predicate.

### `src/lib/ffmpeg/ffprobeParser.ts`
- Parsing/validation ffprobe JSON.

### `src/lib/hash/sha256.ts`
- Файловый SHA256.

### `src/lib/settings/store.ts`
- Persist last used UI settings.

## 5. Data Model (Current)

`RenderSettings.variants`:
- `count`
- `seed: number | null`
- `brightnessRange`
- `contrastRange`
- `saturationRange`
- `volumeRange`
- `bitrateRange`

`RenderVariant`:
- `id`
- `index`
- `blueprintSeed`
- `adjustments`
- `bitrateKbps`
- `outputPath`
- `sidecarPath`

## 6. Determinism Rules

- Если seed задан, список вариаций воспроизводим при одинаковых input settings.
- Если seed пустой, seed генерируется системой.
- Sidecar всегда содержит фактически применённые значения.

## 7. Error Handling Rules

- Если `ffmpeg/ffprobe` отсутствуют в PATH:
  - preview/render недоступны,
  - UI показывает явную ошибку.
- Любой non-zero exit ffmpeg -> `failed` status с причиной.
- Cancel переводит задачи в `cancelled` без silent drop.

## 8. Sidecar Minimum Schema

- `purpose`
- `generatedAt`
- `variantIndex`
- `variantId`
- `blueprintSeed`
- `sourcePath`
- `outputPath`
- `encoder`
- `cleanMetadata`
- `adjustments`
- `bitrateKbps`
- `inputRanges`
- `sha256`

## 9. Next Milestones

1. UI diagnostics block для preview (`video.error.code` + decode status).
2. Preset packs (safe ranges для платформ).
3. Multi-source batch mode (несколько входных файлов).
4. Export/import job profile JSON.
