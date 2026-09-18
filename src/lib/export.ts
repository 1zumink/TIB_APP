import { Platform } from 'react-native';
import * as XLSX from 'xlsx';
import * as Sharing from 'expo-sharing';
import { cacheDirectory, EncodingType, writeAsStringAsync } from 'expo-file-system/legacy';
import { LogEntry, Member } from '../types';
import { fmtDateTime } from './date';

interface ExportOpts {
  log: LogEntry[];
  memberById: (id: string) => Member | undefined;
}

function buildWorkbook({ log, memberById }: ExportOpts) {
  const rows = log
    .slice()
    .sort((a, b) => b.at - a.at)
    .map((l, i) => ({
      '№': i + 1,
      Дата: fmtDateTime(l.at),
      Автор: memberById(l.authorId)?.name ?? '—',
      Проект: l.project ?? '',
      Описание: l.description,
    }));

  const ws = XLSX.utils.json_to_sheet(rows, {
    header: ['№', 'Дата', 'Автор', 'Проект', 'Описание'],
  });
  ws['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 16 }, { wch: 18 }, { wch: 60 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Лог работ');
  return wb;
}

/** Export the work log to .xlsx and open the OS share sheet (native) / download (web). */
export async function exportLogToExcel(opts: ExportOpts): Promise<{ ok: boolean; reason?: string }> {
  if (opts.log.length === 0) return { ok: false, reason: 'empty' };

  const wb = buildWorkbook(opts);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `TIB_log_${stamp}.xlsx`;

  if (Platform.OS === 'web') {
    // Trigger a browser download
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return { ok: true };
  }

  // Native: write base64 to cache, then share
  const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
  const uri = `${cacheDirectory}${filename}`;
  await writeAsStringAsync(uri, base64, { encoding: EncodingType.Base64 });

  const available = await Sharing.isAvailableAsync();
  if (!available) return { ok: false, reason: 'sharing-unavailable' };

  await Sharing.shareAsync(uri, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: 'Экспорт лога работ',
    UTI: 'org.openxmlformats.spreadsheetml.sheet',
  });
  return { ok: true };
}
