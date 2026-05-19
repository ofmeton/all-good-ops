/**
 * 月次給与処理 自動化スクリプト
 * 株式会社 BEAT ICE / RICE CREAM
 *
 * 機能:
 *   1. 出退勤管理スプシから前月の集計値を読み取り
 *   2. 給与明細スプシを自動生成（テンプレコピー → 各従業員シート更新）
 *   3. 各従業員の給与明細を PDF 出力 → Drive 保存（配信は手動）
 *   4. 賃金台帳スプシに前月列を自動追記
 *
 * セットアップ:
 *   1. https://script.google.com/ で新規プロジェクト作成
 *   2. このファイルをコピペ
 *   3. 関数 `setupMonthlyTrigger` を1回だけ実行 → 毎月5日10:00の自動実行が登録される
 *   4. 手動実行したい時は `runForLastMonth` を実行（前月分を処理）
 *   5. 特定月を処理したい時は `runForMonth` の year/month を書き換えて実行
 *
 * 注意:
 *   - 出退勤管理スプシに対象月のシート（YYYYMM形式）が存在することが前提
 *   - 「その他支給」（特別支給）が発生した月は、生成後に手動で各シートを調整すること
 */

// ===== 設定 =====
const CONFIG = {
  // 出退勤管理・給与計算スプシ
  ATTENDANCE_SS_ID: '1CUJOC4i_OOYUAtcBUoDfRVg6apIdzO8I6CixLlN3aoA',
  // 給与明細テンプレ（給与明細_202601）
  PAYSLIP_TEMPLATE_ID: '1uqGLSzkFwjXzDfaaz0-vIuD8JKvUdVurrkSL5RthKHo',
  // 給与明細フォルダ
  PAYSLIP_FOLDER_ID: '1BGhUOgM8L8pj19Dlr_Af7XXjVsJ1G7cE',
  // 賃金台帳スプシ（2025年度）※年度替わりで差し替え
  WAGE_LEDGER_SS_ID: '177vHq3h2HW3fRPMKdS57xnTe7RtUhPWGqIk9OvP6hTs',
  // PDF出力先フォルダ（給与明細フォルダ配下に YYYYMM サブフォルダを自動作成）
  PDF_PARENT_FOLDER_ID: '1BGhUOgM8L8pj19Dlr_Af7XXjVsJ1G7cE',
  // 賃金台帳の対象シート（労働者のみ。業務委託は含めない）
  LEDGER_EMPLOYEES: ['大津 彩渚', '谷口 真悠', '塚本 竜成', '伊藤 真由', '丸山 和貴', '朝比奈 和泉', '佐藤 世壱'],
  // 給与明細の対象シート（労働者のみ。工藤陸は業務委託＝外注費のため給与明細の対象外）
  PAYSLIP_EMPLOYEES: ['大津 彩渚', '谷口 真悠', '塚本 竜成', '伊藤 真由', '丸山 和貴', '朝比奈 和泉', '佐藤 世壱']
};

// 給与明細セルマップ（memory feedback_payslip_template_cells.md 準拠）
const PAYSLIP_CELLS = {
  title: 'A1', payDate: 'I3', cutoffDate: 'I4',
  attendDays: 'B9', totalHours: 'D9', nightHours: 'F9',
  regularPay: 'D12', nightPay: 'F12', transport: 'H12', grossTotal: 'J12',
  otherPay: 'B18', netTotal: 'J18',
  notesLabel: 'A20', notesContent: 'A21'
};

// 賃金台帳の行マップ（1始まり行番号）
const LEDGER_ROWS = {
  workDays: 10, workHours: 11, nightHours: 12,
  basicPay: 13, nightPay: 14, transport: 15,
  subtotal: 16, otherPay: 17, deduction: 18, netPay: 19
};

// ===== トリガー登録（1回だけ実行） =====
function setupMonthlyTrigger() {
  // 既存の同名トリガーを削除
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'monthlyTriggerHandler') {
      ScriptApp.deleteTrigger(t);
    }
  });
  // 毎月5日 10時台に実行
  ScriptApp.newTrigger('monthlyTriggerHandler')
    .timeBased()
    .onMonthDay(5)
    .atHour(10)
    .create();
  Logger.log('✅ 毎月5日10時台の自動実行トリガーを登録しました');
}

// トリガーから呼ばれる: 前月分を処理
function monthlyTriggerHandler() {
  runForLastMonth();
}

// ===== 手動実行用 =====
function runForLastMonth() {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth(); // getMonth()は0始まり = 前月の1始まり相当
  if (month === 0) { month = 12; year -= 1; }
  generateMonthlyPayroll(year, month);
}

function runForMonth() {
  // 特定月を処理したい時はここを書き換えて実行
  const year = 2026;
  const month = 4;
  generateMonthlyPayroll(year, month);
}

// ===== メイン処理 =====
function generateMonthlyPayroll(year, month) {
  const yyyymm = year + ('0' + month).slice(-2);
  Logger.log(`===== ${year}年${month}月 処理開始 =====`);

  // 1. 出退勤データ読み取り
  const attendance = readAttendanceSheet(yyyymm);
  if (!attendance) {
    Logger.log(`⚠️ 出退勤シート「${yyyymm}」が見つかりません。処理中止。`);
    return;
  }

  // 2. 給与明細スプシ生成
  const payslipSsId = createPayslipSpreadsheet(year, month, attendance);
  Logger.log(`✅ 給与明細スプシ生成完了`);

  // 3. PDF出力
  exportPayslipsPdf(payslipSsId, yyyymm);
  Logger.log(`✅ PDF出力完了`);

  // 4. 賃金台帳追記
  appendToWageLedger(month, attendance);
  Logger.log(`✅ 賃金台帳追記完了`);

  Logger.log(`===== ${year}年${month}月 処理完了 =====`);
}

// ===== 1. 出退勤シート読み取り =====
function readAttendanceSheet(yyyymm) {
  const ss = SpreadsheetApp.openById(CONFIG.ATTENDANCE_SS_ID);
  const sheet = ss.getSheetByName(yyyymm);
  if (!sheet) return null;

  const data = sheet.getDataRange().getValues();

  // メンバー名の行を探す（D列が「振込給与」or「日付」を含む行の1つ上、もしくは「日付」ラベル行）
  let headerRow = -1;
  for (let i = 0; i < data.length; i++) {
    if (data[i].indexOf('日付') !== -1) { headerRow = i; break; }
  }
  if (headerRow === -1) {
    Logger.log('⚠️ メンバー名ヘッダー行が見つかりません');
    return null;
  }
  // E列以降（index 4〜）がメンバー名
  const names = data[headerRow].slice(4);

  // 集計行を探す（D列ラベル）
  const wantLabels = ['出勤回数', '交通費', '総実動', '総深夜', '通常給与', '深夜割増給与', '給与'];
  const metrics = {};
  for (let i = 0; i < data.length; i++) {
    const label = data[i][3];
    if (wantLabels.indexOf(label) !== -1 && !metrics[label]) {
      metrics[label] = data[i].slice(4);
    }
  }

  // メンバーごとに集計
  const result = {};
  names.forEach((name, idx) => {
    if (!name || String(name).trim() === '') return;
    const toNum = v => {
      if (v === '' || v == null) return 0;
      return Number(String(v).replace(/[¥,\s]/g, '')) || 0;
    };
    result[String(name).trim()] = {
      attendDays: toNum(metrics['出勤回数'] ? metrics['出勤回数'][idx] : 0),
      transport:  toNum(metrics['交通費'] ? metrics['交通費'][idx] : 0),
      totalHours: toNum(metrics['総実動'] ? metrics['総実動'][idx] : 0),
      nightHours: toNum(metrics['総深夜'] ? metrics['総深夜'][idx] : 0),
      regularPay: toNum(metrics['通常給与'] ? metrics['通常給与'][idx] : 0),
      nightPay:   toNum(metrics['深夜割増給与'] ? metrics['深夜割増給与'][idx] : 0),
      grossPay:   toNum(metrics['給与'] ? metrics['給与'][idx] : 0)
    };
  });
  return result;
}

// ===== 2. 給与明細スプシ生成 =====
function createPayslipSpreadsheet(year, month, attendance) {
  const yyyymm = year + ('0' + month).slice(-2);
  const template = DriveApp.getFileById(CONFIG.PAYSLIP_TEMPLATE_ID);
  const folder = DriveApp.getFolderById(CONFIG.PAYSLIP_FOLDER_ID);
  const newFile = template.makeCopy('給与明細_' + yyyymm, folder);
  const ss = SpreadsheetApp.openById(newFile.getId());

  // 支給日 = 翌月20日、締日 = 当月末日
  const payDate = nextMonth20(year, month);
  const cutoffDate = lastDayOfMonth(year, month);

  CONFIG.PAYSLIP_EMPLOYEES.forEach(empName => {
    const sheet = ss.getSheetByName(empName);
    if (!sheet) {
      Logger.log('⚠️ 給与明細シート「' + empName + '」なし');
      return;
    }
    const a = attendance[empName] || {
      attendDays: 0, totalHours: 0, nightHours: 0,
      regularPay: 0, nightPay: 0, transport: 0, grossPay: 0
    };
    // grossPay には「その他支給」が含まれない前提（通常月）。
    // 支給額合計 = 通常給与 + 深夜給与 + 交通費
    const grossTotal = a.regularPay + a.nightPay + a.transport;

    sheet.getRange(PAYSLIP_CELLS.title).setValue('給与明細書（' + year + '年' + month + '月分）');
    sheet.getRange(PAYSLIP_CELLS.payDate).setValue(payDate);
    sheet.getRange(PAYSLIP_CELLS.cutoffDate).setValue(cutoffDate);
    sheet.getRange(PAYSLIP_CELLS.attendDays).setValue(a.attendDays);
    sheet.getRange(PAYSLIP_CELLS.totalHours).setValue(a.totalHours);
    sheet.getRange(PAYSLIP_CELLS.nightHours).setValue(a.nightHours);
    sheet.getRange(PAYSLIP_CELLS.regularPay).setValue(a.regularPay);
    sheet.getRange(PAYSLIP_CELLS.nightPay).setValue(a.nightPay);
    sheet.getRange(PAYSLIP_CELLS.transport).setValue(a.transport);
    sheet.getRange(PAYSLIP_CELLS.grossTotal).setValue(grossTotal);
    sheet.getRange(PAYSLIP_CELLS.otherPay).setValue(0);
    sheet.getRange(PAYSLIP_CELLS.netTotal).setValue(grossTotal);
    sheet.getRange(PAYSLIP_CELLS.notesLabel).setValue('備考欄');
    // grossPay と grossTotal がズレたら特別支給の可能性 → 備考に警告
    if (Math.abs(a.grossPay - grossTotal) > 1) {
      sheet.getRange(PAYSLIP_CELLS.notesContent).setValue(
        '⚠️要確認: 出退勤シートの給与(' + a.grossPay + ') と内訳合計(' + grossTotal + ') が不一致。特別支給の可能性あり。手動調整してください。'
      );
    } else {
      sheet.getRange(PAYSLIP_CELLS.notesContent).setValue('');
    }
  });

  return newFile.getId();
}

// ===== 3. PDF出力 =====
function exportPayslipsPdf(payslipSsId, yyyymm) {
  const ss = SpreadsheetApp.openById(payslipSsId);
  const parent = DriveApp.getFolderById(CONFIG.PDF_PARENT_FOLDER_ID);

  // YYYYMM サブフォルダを作成（なければ）
  let pdfFolder;
  const existing = parent.getFoldersByName('給与明細PDF_' + yyyymm);
  pdfFolder = existing.hasNext() ? existing.next() : parent.createFolder('給与明細PDF_' + yyyymm);

  CONFIG.PAYSLIP_EMPLOYEES.forEach(empName => {
    const sheet = ss.getSheetByName(empName);
    if (!sheet) return;
    const sheetId = sheet.getSheetId();
    const url = 'https://docs.google.com/spreadsheets/d/' + payslipSsId +
      '/export?format=pdf&gid=' + sheetId +
      '&size=A4&portrait=true&fitw=true&gridlines=false&printtitle=false&sheetnames=false';
    const blob = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }
    }).getBlob().setName('給与明細_' + yyyymm + '_' + empName + '.pdf');
    pdfFolder.createFile(blob);
  });
  Logger.log('PDF出力先: ' + pdfFolder.getUrl());
}

// ===== 4. 賃金台帳追記 =====
function appendToWageLedger(month, attendance) {
  const ss = SpreadsheetApp.openById(CONFIG.WAGE_LEDGER_SS_ID);
  const col = monthToColumn(month); // 月 → 列番号

  CONFIG.LEDGER_EMPLOYEES.forEach(empName => {
    const sheet = ss.getSheetByName(empName);
    if (!sheet) {
      Logger.log('⚠️ 賃金台帳シート「' + empName + '」なし');
      return;
    }
    const a = attendance[empName] || {
      attendDays: 0, totalHours: 0, nightHours: 0,
      regularPay: 0, nightPay: 0, transport: 0, grossPay: 0
    };
    const subtotal = a.regularPay + a.nightPay + a.transport;

    sheet.getRange(LEDGER_ROWS.workDays, col).setValue(a.attendDays);
    sheet.getRange(LEDGER_ROWS.workHours, col).setValue(a.totalHours);
    sheet.getRange(LEDGER_ROWS.nightHours, col).setValue(a.nightHours);
    sheet.getRange(LEDGER_ROWS.basicPay, col).setValue(a.regularPay);
    sheet.getRange(LEDGER_ROWS.nightPay, col).setValue(a.nightPay);
    sheet.getRange(LEDGER_ROWS.transport, col).setValue(a.transport);
    sheet.getRange(LEDGER_ROWS.subtotal, col).setValue(subtotal);
    sheet.getRange(LEDGER_ROWS.otherPay, col).setValue(0);
    sheet.getRange(LEDGER_ROWS.deduction, col).setValue(0);
    sheet.getRange(LEDGER_ROWS.netPay, col).setValue(subtotal);

    // 合計列（N=14）を再計算
    recalcLedgerTotal(sheet);
  });
}

// 賃金台帳の合計列（N列=14）を 9月〜3月（G〜M列=7〜13）の合計で再計算
function recalcLedgerTotal(sheet) {
  Object.values(LEDGER_ROWS).forEach(row => {
    let sum = 0;
    for (let c = 7; c <= 13; c++) {  // G(7)〜M(13)
      const v = sheet.getRange(row, c).getValue();
      sum += (typeof v === 'number') ? v : 0;
    }
    sheet.getRange(row, 14).setValue(Math.round(sum * 100) / 100);  // N列
  });
}

// ===== ユーティリティ =====
// 会計年度（4月始まり）の月 → 賃金台帳の列番号
// 4月=B(2) ... 12月=J(10), 1月=K(11) ... 3月=M(13)
function monthToColumn(month) {
  return (month >= 4) ? (month - 2) : (month + 10);
}

function nextMonth20(year, month) {
  let y = year, m = month + 1;
  if (m > 12) { m = 1; y += 1; }
  return y + '年' + m + '月20日';
}

function lastDayOfMonth(year, month) {
  const d = new Date(year, month, 0); // month は1始まり、0日 = 前月末
  return year + '年' + month + '月' + d.getDate() + '日';
}
