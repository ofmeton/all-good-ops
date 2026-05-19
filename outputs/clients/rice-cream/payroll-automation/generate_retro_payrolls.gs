/**
 * 給与明細 R7.10〜12 遡及発行スクリプト
 * 株式会社 BEAT ICE / RICE CREAM
 *
 * 使い方:
 * 1. https://script.google.com/ にアクセス
 * 2. 新規プロジェクト作成
 * 3. このファイルの内容を全部コピペ
 * 4. 初回実行時に Drive アクセス権限の承認ダイアログが出る → 許可
 * 5. 関数 `generateRetroPayrolls` を選択して実行
 * 6. 「実行ログ」に各月のスプシURLが出力される
 *
 * 9月分は手作業で作成済み:
 *   https://docs.google.com/spreadsheets/d/1CGkbOVuapj_GYekLkeBl29Ei1VbOiKiVY8Dpviafe-Q/edit
 */

// ===== 設定 =====
const TEMPLATE_ID = '1uqGLSzkFwjXzDfaaz0-vIuD8JKvUdVurrkSL5RthKHo';  // 給与明細_202601 をテンプレ
const PAYROLL_FOLDER_ID = '1BGhUOgM8L8pj19Dlr_Af7XXjVsJ1G7cE';      // 給与明細フォルダ

// ===== 共通: 給与明細セルマップ =====
// memory feedback_payslip_template_cells.md 参照
// A20 は「備考欄」項目名ラベル、内容は A21 以下に書く
const CELL_MAP = {
  title:        'A1',
  payDate:      'I3',
  cutoffDate:   'I4',
  attendDays:   'B9',
  totalHours:   'D9',
  nightHours:   'F9',
  regularPay:   'D12',
  nightPay:     'F12',
  transport:    'H12',
  grossTotal:   'J12',
  otherPay:     'B18',
  netTotal:     'J18',
  notesLabel:   'A20',
  notesContent: 'A21'
};

// ===== R7.10〜12月 データ =====
// データソース: 事業計画書_BEAT-ICE_ライスクリーム.xlsx の「実績入力 人件費管理」シート
// 工藤陸は業務委託（マネージャー業務委託費は別途処理）のため形式上空欄
const PAYROLL_DATA = {
  '202510': {
    payDate:    '2025年11月20日',
    cutoffDate: '2025年10月31日',
    employees: {
      '大津 彩渚':   { 出勤: 1, 時間: 4,    深夜: 0,   通常: 5200,  深夜給: 0, 交通: 2082, 合計: 7282,    備考: '交通費2082円は10月分(694)+9月分(1388)後払い' },
      '谷口 真悠':   { 出勤: 0, 時間: 0,    深夜: 0,   通常: 0,     深夜給: 0, 交通: 0,    合計: 0,       備考: '遡及発行｜2025-12入社のため10月シフトなし' },
      '塚本 竜成':   { 出勤: 2, 時間: 8.5,  深夜: 0,   通常: 11050, 深夜給: 0, 交通: 1570, 合計: 12620,   備考: '' },
      '伊藤 真由':   { 出勤: 0, 時間: 0,    深夜: 0,   通常: 0,     深夜給: 0, 交通: 0,    合計: 0,       備考: '遡及発行｜2025-11入社のため10月シフトなし' },
      '丸山 和貴':   { 出勤: 1, 時間: 6.13, 深夜: 1.5, 通常: 7962.5,深夜給: 0, 交通: 2574, 合計: 10536.5, 備考: '交通費2574円は10月分(858)+9月分(1716)後払い' },
      '朝比奈 和泉': { 出勤: 1, 時間: 5,    深夜: 0,   通常: 6500,  深夜給: 0, 交通: 920,  合計: 7420,    備考: '交通費920円は10月分(460)+9月分(460)後払い' },
      '工藤 陸':     { 出勤: 0, 時間: 0,    深夜: 0,   通常: 0,     深夜給: 0, 交通: 0,    合計: 0,       備考: '業務委託のため形式上空欄（マネージャー業務委託費は別途処理）' },
      '佐藤 世壱':   { 出勤: 0, 時間: 0,    深夜: 0,   通常: 0,     深夜給: 0, 交通: 0,    合計: 0,       備考: '遡及発行｜2025-12入社のため10月シフトなし' }
    }
  },
  '202511': {
    payDate:    '2025年12月20日',
    cutoffDate: '2025年11月30日',
    employees: {
      '大津 彩渚':   { 出勤: 2, 時間: 9.83,  深夜: 2,    通常: 12783.33, 深夜給: 0, 交通: 1388, 合計: 14171,    備考: '' },
      '谷口 真悠':   { 出勤: 0, 時間: 0,     深夜: 0,    通常: 0,        深夜給: 0, 交通: 0,    合計: 0,        備考: '遡及発行｜2025-12入社のため11月シフトなし' },
      '塚本 竜成':   { 出勤: 2, 時間: 11.5,  深夜: 0,    通常: 14950,    深夜給: 0, 交通: 1570, 合計: 16520,    備考: '' },
      '伊藤 真由':   { 出勤: 1, 時間: 5,     深夜: 0,    通常: 6500,     深夜給: 0, 交通: 966,  合計: 7466,     備考: '初回出勤' },
      '丸山 和貴':   { 出勤: 4, 時間: 39.33, 深夜: 4.83, 通常: 51133.33, 深夜給: 0, 交通: 4290, 合計: 55423,    備考: '' },
      '朝比奈 和泉': { 出勤: 3, 時間: 13.42, 深夜: 1.42, 通常: 17441.67, 深夜給: 0, 交通: 1380, 合計: 18822,    備考: '' },
      '工藤 陸':     { 出勤: 0, 時間: 0,     深夜: 0,    通常: 0,        深夜給: 0, 交通: 0,    合計: 0,        備考: '業務委託のため形式上空欄（マネージャー業務委託費は別途処理）' },
      '佐藤 世壱':   { 出勤: 0, 時間: 0,     深夜: 0,    通常: 0,        深夜給: 0, 交通: 0,    合計: 0,        備考: '遡及発行｜2025-12入社のため11月シフトなし' }
    }
  },
  '202512': {
    payDate:    '2026年1月20日',
    cutoffDate: '2025年12月31日',
    employees: {
      '大津 彩渚':   { 出勤: 2, 時間: 9.63,  深夜: 1.5, 通常: 12512.5,  深夜給: 487.5,  交通: 1388, 合計: 14388, 備考: '深夜給487.5円は11月分の追加計上' },
      '谷口 真悠':   { 出勤: 2, 時間: 17.75, 深夜: 0,   通常: 23075,    深夜給: 0,      交通: 2240, 合計: 25315, 備考: '初回出勤' },
      '塚本 竜成':   { 出勤: 2, 時間: 11.63, 深夜: 0,   通常: 15112.5,  深夜給: 243.75, 交通: 1570, 合計: 16926, 備考: '深夜給243.75円は11月分の追加計上' },
      '伊藤 真由':   { 出勤: 1, 時間: 5.44,  深夜: 0,   通常: 7068.75,  深夜給: 243.75, 交通: 966,  合計: 8279,  備考: '深夜給243.75円は11月分の追加計上' },
      '丸山 和貴':   { 出勤: 3, 時間: 18.39, 深夜: 3,   通常: 23914.58, 深夜給: 1543.75,交通: 2574, 合計: 28032, 備考: '深夜給1543.75円は11月分の追加計上' },
      '朝比奈 和泉': { 出勤: 3, 時間: 9.5,   深夜: 1.5, 通常: 12351,    深夜給: 650,    交通: 920,  合計: 13921, 備考: '深夜給650円は11月分の追加計上' },
      '工藤 陸':     { 出勤: 0, 時間: 0,    深夜: 0,    通常: 0,        深夜給: 0,      交通: 0,    合計: 0,     備考: '業務委託のため形式上空欄（マネージャー業務委託費は別途処理）' },
      '佐藤 世壱':   { 出勤: 3, 時間: 18.63, 深夜: 0,   通常: 24212.5,  深夜給: 0,      交通: 3330, 合計: 27543, 備考: '初回出勤' }
    }
  }
};

// ===== メイン関数 =====
function generateRetroPayrolls() {
  const results = [];

  for (const [yyyymm, monthData] of Object.entries(PAYROLL_DATA)) {
    const year = parseInt(yyyymm.substring(0, 4));
    const month = parseInt(yyyymm.substring(4));

    // テンプレからコピー
    const templateFile = DriveApp.getFileById(TEMPLATE_ID);
    const folder = DriveApp.getFolderById(PAYROLL_FOLDER_ID);
    const newFile = templateFile.makeCopy(`給与明細_${yyyymm}`, folder);
    const ss = SpreadsheetApp.openById(newFile.getId());

    // 各従業員シートを更新
    for (const [empName, empData] of Object.entries(monthData.employees)) {
      const sheet = ss.getSheetByName(empName);
      if (!sheet) {
        Logger.log(`⚠️ シート「${empName}」が見つかりません（${yyyymm}）`);
        continue;
      }
      writeEmployeeSheet(sheet, year, month, monthData, empData);
    }

    const url = newFile.getUrl();
    results.push(`${yyyymm}: ${url}`);
    Logger.log(`✅ ${yyyymm} 完了: ${url}`);
  }

  Logger.log('===== 全完了 =====');
  results.forEach(r => Logger.log(r));
}

// ===== 単一シート書き込み =====
function writeEmployeeSheet(sheet, year, month, monthData, empData) {
  sheet.getRange(CELL_MAP.title).setValue(`給与明細書（${year}年${month}月分）`);
  sheet.getRange(CELL_MAP.payDate).setValue(monthData.payDate);
  sheet.getRange(CELL_MAP.cutoffDate).setValue(monthData.cutoffDate);
  sheet.getRange(CELL_MAP.attendDays).setValue(empData.出勤);
  sheet.getRange(CELL_MAP.totalHours).setValue(empData.時間);
  sheet.getRange(CELL_MAP.nightHours).setValue(empData.深夜);
  sheet.getRange(CELL_MAP.regularPay).setValue(empData.通常);
  sheet.getRange(CELL_MAP.nightPay).setValue(empData.深夜給);
  sheet.getRange(CELL_MAP.transport).setValue(empData.交通);
  sheet.getRange(CELL_MAP.grossTotal).setValue(empData.合計);
  sheet.getRange(CELL_MAP.otherPay).setValue(0);
  sheet.getRange(CELL_MAP.netTotal).setValue(empData.合計);
  sheet.getRange(CELL_MAP.notesLabel).setValue('備考欄');
  sheet.getRange(CELL_MAP.notesContent).setValue(empData.備考 || '遡及発行（労基法108条・所得税法231条整備のため）');
}
