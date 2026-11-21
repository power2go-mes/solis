import * as XLSX from "xlsx";

/**
 * Clean helper to export tabular data directly to an Excel (.xlsx) file in browser
 */
export function exportToExcel(
  sheets: { sheetName: string; data: Record<string, any>[] }[],
  fileName: string
) {
  const wb = XLSX.utils.book_new();

  for (const { sheetName, data } of sheets) {
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  }

  const cleanFileName = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(wb, cleanFileName);
}
