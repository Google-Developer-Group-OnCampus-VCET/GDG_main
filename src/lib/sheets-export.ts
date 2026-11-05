/**
 * Universal Export to Google Sheets & Excel Utility
 *
 * Generates RFC-4180 compliant CSV files with a UTF-8 Byte Order Mark (BOM)
 * to ensure numbers, Indian phone codes (+91), dates, and UTF-8 characters
 * open flawlessly in Google Sheets and Microsoft Excel without corruption.
 * Also provides a one-click clipboard copy formatted as Tab-Separated Values (TSV)
 * for instant Ctrl+V pasting into any open Google Spreadsheet.
 */

export interface ExportColumn<T = object> {
  key: keyof T | string;
  label: string;
  format?: (value: unknown, row: T) => string | number | boolean;
}

function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val).replace(/"/g, '""');
  // If field contains comma, newline, or double quote, wrap in quotes
  if (str.includes(",") || str.includes("\n") || str.includes("\r") || str.includes('"')) {
    return `"${str}"`;
  }
  return str;
}

function escapeTsvField(val: unknown): string {
  if (val === null || val === undefined) return "";
  // Strip tabs and newlines for clean tab-separated clipboard paste
  return String(val).replace(/\t/g, " ").replace(/\r?\n/g, " ");
}

/**
 * Downloads data as a CSV file optimized for Google Sheets import.
 */
export function downloadForGoogleSheets<T extends object>(
  filename: string,
  rows: T[],
  columns: ExportColumn<T>[]
): void {
  if (!rows || rows.length === 0) {
    alert("No records to export.");
    return;
  }

  const headerLine = columns.map((col) => escapeCsvField(col.label)).join(",");
  const dataLines = rows.map((row) =>
    columns
      .map((col) => {
        const rawValue = (row as Record<string, unknown>)[col.key as string];
        const formatted = col.format ? col.format(rawValue, row) : rawValue;
        return escapeCsvField(formatted);
      })
      .join(",")
  );

  // UTF-8 BOM prefix (\uFEFF) forces Google Sheets and Excel to decode UTF-8 correctly
  const csvContent = "\uFEFF" + [headerLine, ...dataLines].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  const safeFilename = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.download = safeFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copies formatted tab-separated values to the user's clipboard for direct paste (Ctrl+V) into Google Sheets.
 */
export async function copyForGoogleSheets<T extends object>(
  rows: T[],
  columns: ExportColumn<T>[]
): Promise<boolean> {
  if (!rows || rows.length === 0) return false;

  const headerLine = columns.map((col) => escapeTsvField(col.label)).join("\t");
  const dataLines = rows.map((row) =>
    columns
      .map((col) => {
        const rawValue = (row as Record<string, unknown>)[col.key as string];
        const formatted = col.format ? col.format(rawValue, row) : rawValue;
        return escapeTsvField(formatted);
      })
      .join("\t")
  );

  const tsvContent = [headerLine, ...dataLines].join("\n");

  try {
    await navigator.clipboard.writeText(tsvContent);
    return true;
  } catch (err) {
    console.warn("Clipboard write failed:", err);
    return false;
  }
}
