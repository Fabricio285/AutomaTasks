
import { BusinessHours } from './types';

/**
 * Convierte un enlace de compartir de Google Drive en un enlace de descarga directa.
 */
export const convertDriveLink = (url: string): string => {
  if (!url) return '';
  if (url.includes('drive.google.com/file/d/')) {
    const id = url.split('/d/')[1].split('/')[0];
    return `https://docs.google.com/uc?export=download&id=${id}`;
  }
  if (url.includes('docs.google.com/spreadsheets/d/')) {
    const id = url.split('/d/')[1].split('/')[0];
    return `https://docs.google.com/uc?export=download&id=${id}`;
  }
  return url;
};

/**
 * Calculates the working hours elapsed between two timestamps based on business hours config.
 */
export const calculateWorkingHoursElapsed = (
  start: number,
  end: number,
  config: BusinessHours
): number => {
  if (end <= start) return 0;

  let totalMs = 0;
  let current = new Date(start);
  const finish = new Date(end);

  while (current < finish) {
    const day = current.getDay();
    const dayConfig = config[day];

    if (dayConfig && dayConfig.active) {
      const [startH, startM] = dayConfig.start.split(':').map(Number);
      const [endH, endM] = dayConfig.end.split(':').map(Number);

      const workStart = new Date(current);
      workStart.setHours(startH, startM, 0, 0);

      const workEnd = new Date(current);
      workEnd.setHours(endH, endM, 0, 0);

      const effectiveStart = Math.max(current.getTime(), workStart.getTime());
      const effectiveEnd = Math.min(finish.getTime(), workEnd.getTime());

      if (effectiveEnd > effectiveStart) {
        totalMs += (effectiveEnd - effectiveStart);
      }
    }

    current.setDate(current.getDate() + 1);
    current.setHours(0, 0, 0, 0);
  }

  return totalMs / (1000 * 60 * 60);
};

export const calculateEfficiency = (estimated: number, actual: number): number => {
  if (actual === 0) return 0;
  return Math.round((estimated / actual) * 100);
};

export const formatDuration = (hours: number): string => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
};
