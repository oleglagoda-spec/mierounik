# Creative A/B Test Studio (Electron + React)

Desktop-инструмент для легальной подготовки видеокреативов и A/B тестов.

## Важно

Проект **не содержит** функций обхода модерации, антиспама, антидубликатов или рекламных ограничений.
Использование позиционируется как:
- подготовка легальных вариаций креативов,
- сравнительное тестирование визуальных параметров,
- техническая обработка видео перед размещением.

## MVP (реализовано)

- загрузка видео
- настройка `brightness / contrast / saturation / volume`
- preview на 5 секунд
- batch render `N` вариантов
- сохранение в выбранную папку
- live-лог процесса
- обработка ошибок
- отмена рендера
- кнопка `Открыть папку результата`

## После MVP (реализовано)

- `grid overlay`
- `fade in / fade out` (видео и аудио)
- очистка метаданных (`-map_metadata -1`)
- выбор энкодера GPU/CPU (`libx264`, `h264_nvenc`, `h264_qsv`, `h264_videotoolbox`, `h264_amf`)
- JSON sidecar рядом с каждым выходным файлом
- SHA256 hash выходного файла

## Структура

- `package.json`
- `electron/main.ts`
- `electron/preload.ts`
- `src/App.tsx`
- `src/components/`
- `src/lib/ffmpeg/`
- `src/lib/jobs/`
- `src/lib/settings/`
- `src/lib/hash/`
- `src/types/`
- `README.md`

## Запуск

Требования:
- Node.js 20+
- `ffmpeg` и `ffprobe` в PATH

```bash
npm install
npm run dev
```

## Сборка

```bash
npm run build
```

## Архитектура модулей

- `src/lib/ffmpeg/commandBuilder.ts`:
  строит аргументы ffmpeg для preview и render
- `src/lib/ffmpeg/randomGenerator.ts`:
  генерация вариаций параметров в заданном диапазоне
- `src/lib/ffmpeg/ffprobeParser.ts`:
  безопасный парсинг `ffprobe` JSON
- `src/lib/ffmpeg/ffmpegRunner.ts`:
  запуск ffmpeg с логами и поддержкой отмены
- `src/lib/jobs/jobQueue.ts`:
  очередь задач рендера
- `src/lib/settings/store.ts`:
  хранение пользовательских настроек (`userData/settings.json`)
- `src/lib/hash/sha256.ts`:
  расчёт SHA256 файла

## Sidecar JSON

Для каждого варианта создаётся файл `*.mp4.json` с:
- индексом варианта
- базовыми настройками
- выбранным энкодером
- флагом очистки метаданных
- SHA256 итогового файла
- timestamp генерации
