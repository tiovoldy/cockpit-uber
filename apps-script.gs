/**
 * Cole este código em: Google Planilha -> Extensões -> Apps Script
 * Depois clique em: Implantar -> Gerenciar implantações -> Editar (lápis) -> Nova versão -> Implantar
 */

function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const turnosSheet = ss.getSheetByName("Turnos");
  const gastosSheet = ss.getSheetByName("Combustivel_Gastos");

  const turnos = readRows(turnosSheet, 17).filter(r => r[0] !== "");
  const gastos = readRows(gastosSheet, 10).filter(r => r[0] !== "");

  const shifts = turnos.map(r => ({
    date: formatDateBR(r[0]),
    dayLabel: formatShortDay(r[0], r[2]),
    inCurrentCycle: isCurrentCycle(r[1]),
    block: String(r[3] || ""),
    start: formatTimeBR(r[4]),
    end: formatTimeBR(r[5]),
    hours: Number(r[6]) || 0,
    trips: Number(r[7]) || 0,
    km: r[8] === "" ? null : Number(r[8]),
    gross: Number(r[9]) || 0,
    tips: Number(r[10]) || 0
  }));

  const expenses = gastos.map(r => ({
    date: formatDateBR(r[0]),
    inCurrentCycle: isCurrentCycle(r[1]),
    category: String(r[2] || ""),
    fuelType: String(r[3] || "-"),
    liters: r[4] === "" ? null : Number(r[4]),
    amount: Number(r[5]) || 0,
    note: String(r[9] || "")
  }));

  return jsonResponse({ ok: true, shifts, expenses });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const today = body.date ? parseDateBR(body.date) : new Date();

    if (body.type === "shift") {
      const gross = Number(body.gross);
      if (!gross || gross <= 0) {
        return jsonResponse({ ok: false, error: "Ganho bruto inválido." });
      }
      const sheet = ss.getSheetByName("Turnos");
      const row = findFirstEmptyRow(sheet, 1); // Coluna A (Data)

      sheet.getRange(row, 1).setValue(today);
      sheet.getRange(row, 4).setValue(body.block || "Bloco 1 (9h-17h)");
      sheet.getRange(row, 5).setValue(body.start || "09:00");
      sheet.getRange(row, 6).setValue(body.end || "17:00");
      if (body.trips !== "" && body.trips !== null && body.trips !== undefined) {
        sheet.getRange(row, 8).setValue(Number(body.trips));
      }
      if (body.km !== "" && body.km !== null && body.km !== undefined) {
        sheet.getRange(row, 9).setValue(Number(body.km));
      }
      sheet.getRange(row, 10).setValue(gross);
      sheet.getRange(row, 11).setValue(Number(body.tips) || 0);

      return jsonResponse({ ok: true, type: "shift", row });
    }

    // Padrão: Gasto / Combustível
    const amount = Number(body.amount);
    if (!amount || amount <= 0) {
      return jsonResponse({ ok: false, error: "Valor inválido." });
    }

    const sheet = ss.getSheetByName("Combustivel_Gastos");
    const lastRow = findFirstEmptyRow(sheet, 1);

    const category = body.category || "Combustível";
    const fuelType = body.fuelType || "-";
    const liters = body.liters ? Number(body.liters) : "";
    const odometer = body.odometer ? Number(body.odometer) : "";
    const note = body.note || "Lançado pelo celular";

    sheet.getRange(lastRow, 1).setValue(today);
    sheet.getRange(lastRow, 3).setValue(category);
    sheet.getRange(lastRow, 4).setValue(fuelType);
    if (liters !== "") sheet.getRange(lastRow, 5).setValue(liters);
    sheet.getRange(lastRow, 6).setValue(amount);
    if (odometer !== "") sheet.getRange(lastRow, 7).setValue(odometer);
    sheet.getRange(lastRow, 10).setValue(note);

    return jsonResponse({ ok: true, type: "expense", row: lastRow });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

function readRows(sheet, cols) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, cols).getValues();
}

function findFirstEmptyRow(sheet, col) {
  const vals = sheet.getRange(2, col, Math.max(1, sheet.getLastRow()), 1).getValues();
  for (let i = 0; i < vals.length; i++) {
    if (vals[i][0] === "" || vals[i][0] === null) return i + 2;
  }
  return sheet.getLastRow() + 1;
}

function isCurrentCycle(cycleVal) {
  if (!(cycleVal instanceof Date)) return false;
  const now = new Date();
  const day = now.getDay();
  const diffToTue = (day - 2 + 7) % 7;
  const currentTue = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToTue);
  return (
    cycleVal.getFullYear() === currentTue.getFullYear() &&
    cycleVal.getMonth() === currentTue.getMonth() &&
    cycleVal.getDate() === currentTue.getDate()
  );
}

function formatDateBR(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, "America/Sao_Paulo", "dd/MM/yyyy");
  }
  return String(v || "");
}

function formatShortDay(v, dayName) {
  if (v instanceof Date) {
    const dm = Utilities.formatDate(v, "America/Sao_Paulo", "dd/MM");
    const prefix = String(dayName || "").slice(0, 3);
    return prefix ? `${prefix} ${dm}` : dm;
  }
  return String(v || "");
}

function formatTimeBR(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, "America/Sao_Paulo", "HH:mm");
  }
  return String(v || "");
}

function parseDateBR(str) {
  const parts = String(str).split("/");
  if (parts.length === 3) {
    return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  }
  return new Date();
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
