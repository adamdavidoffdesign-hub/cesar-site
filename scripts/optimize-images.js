#!/usr/bin/env node
/**
 * Оптимизация изображений:
 * - Сжимает JPG/PNG в папках images/
 * - Максимальная ширина 1920px (сохраняет пропорции)
 * - Создаёт WebP-версии рядом с оригиналами
 * - Оригинальные файлы заменяются сжатыми (меньший размер)
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const IMAGES_DIR = path.join(__dirname, '..', 'images');
const MAX_WIDTH = 1920;
const JPG_QUALITY = 88;
const WEBP_QUALITY = 88;

let totalSaved = 0;
let processed = 0;

function formatSize(bytes) {
  return (bytes / 1024).toFixed(1) + ' KB';
}

async function optimizeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) return;

  const statBefore = fs.statSync(filePath).size;
  const tmpPath = filePath + '.tmp';

  try {
    let pipeline = sharp(filePath).rotate(); // auto-rotate based on EXIF

    const meta = await sharp(filePath).metadata();
    if (meta.width > MAX_WIDTH) {
      pipeline = pipeline.resize(MAX_WIDTH, null, { withoutEnlargement: true });
    }

    if (ext === '.png') {
      await pipeline.png({ compressionLevel: 9, quality: 85 }).toFile(tmpPath);
    } else {
      await pipeline.jpeg({ quality: JPG_QUALITY, mozjpeg: true }).toFile(tmpPath);
    }

    const statAfter = fs.statSync(tmpPath).size;

    if (statAfter < statBefore) {
      fs.renameSync(tmpPath, filePath);
      const saved = statBefore - statAfter;
      totalSaved += saved;
      console.log(`✓ ${path.relative(process.cwd(), filePath)}: ${formatSize(statBefore)} → ${formatSize(statAfter)} (−${formatSize(saved)})`);
    } else {
      fs.unlinkSync(tmpPath);
      console.log(`= ${path.relative(process.cwd(), filePath)}: уже оптимизирован (${formatSize(statBefore)})`);
    }

    // Create / update WebP version
    const webpPath = filePath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    await sharp(filePath).webp({ quality: WEBP_QUALITY }).toFile(webpPath);

    processed++;
  } catch (err) {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    console.error(`✗ Ошибка: ${filePath}: ${err.message}`);
  }
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      files.push(...walkDir(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  console.log('🖼  Оптимизация изображений...\n');
  const files = walkDir(IMAGES_DIR);

  for (const file of files) {
    await optimizeFile(file);
  }

  console.log(`\n✅ Готово: обработано ${processed} файлов, сэкономлено ${formatSize(totalSaved)}`);
}

main().catch(console.error);
