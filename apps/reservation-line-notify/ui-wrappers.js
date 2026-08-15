
// --- GASエディタ/トリガー用トップレベルラッパー（ビルド時付与・IIFE外） ---
// GASエディタの実行/トリガーUIは IIFE内+globalThis露出の関数を選択肢に出さないため、
// トップレベル関数として薄いラッパーを置く。
function ui_setupTrigger() { setupTrigger(); }
function ui_pollInbox() { pollInbox(); }

// 検知クエリ。差出人に依存させず、件名か本文のどちらか一方の一致で拾う。
// Roopt から直接 / Gmail 自動転送 / 手動転送 のいずれの届き方でも通る。
var DEFAULT_GMAIL_QUERY =
  '{subject:(アクティビティ予約) "アクティビティ予約が入りました"} newer_than:7d -in:sent -in:draft -in:trash';

// 初回セットアップ: 履歴用スプレッドシートを作り、SHEET_ID と GMAIL_QUERY を入れる。
// 何度実行しても既存値は壊さない。LINE_TOKEN だけは本人が手で入れる。
function ui_bootstrap() {
  var P = PropertiesService.getScriptProperties();
  var out = {};
  var sheetId = P.getProperty("SHEET_ID");
  if (!sheetId) {
    var ss = SpreadsheetApp.create("食体験 予約通知 履歴");
    sheetId = ss.getId();
    P.setProperty("SHEET_ID", sheetId);
    out.createdSheet = true;
  }
  out.sheetUrl = "https://docs.google.com/spreadsheets/d/" + sheetId + "/edit";
  if (!P.getProperty("GMAIL_QUERY")) P.setProperty("GMAIL_QUERY", DEFAULT_GMAIL_QUERY);
  out.gmailQuery = P.getProperty("GMAIL_QUERY");
  out.matchedMails = GmailApp.search(P.getProperty("GMAIL_QUERY"), 0, 50).length;
  out.hasLineToken = !!P.getProperty("LINE_TOKEN");
  out.hasGroupId = !!P.getProperty("LINE_GROUP_ID");
  P.setProperty("BOOTSTRAP_RESULT", JSON.stringify(out));
  console.log(JSON.stringify(out, null, 2));
}

// 再テスト用: 取り込み済み(message_id)と送信済み(dedup_id)の状態をクリアする。
function ui_clearProcessed() {
  var id = PropertiesService.getScriptProperties().getProperty("SHEET_ID");
  var ss = SpreadsheetApp.openById(id);
  ["processed", "sent"].forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (sh) ss.deleteSheet(sh);
  });
}

// 手動診断: 実メール1通から通知メッセージを組み立てて push し、結果を DIAG_RESULT に残す。
function ui_diag() {
  var P = PropertiesService.getScriptProperties();
  var d = {};
  try {
    var threads = GmailApp.search(P.getProperty("GMAIL_QUERY"), 0, 5);
    var body = threads[0].getMessages()[0].getPlainBody();
    function ef(label){ var re=new RegExp("■\\s*"+label.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\s*:\\s*(.*)"); var mm=body.match(re); return mm?mm[1].trim():""; }
    function fee(raw){ if(!raw) return null; var dg=raw.replace(/[,，]/g,"").match(/\d+/); return dg?Number(dg[0]):null; }
    var name = ef("アクティビティ");
    var date = ef("日付");
    var time = ef("開催時間");
    var parts = ef("参加人数");
    var feeN = fee(ef("料金"));
    var facility = ef("宿泊施設");
    var am = body.match(/https:\/\/\S*[?&]r=\S*/);
    var approvalUrl = am ? am[0] : "";
    var yen = (feeN==null) ? "¥-" : "¥"+feeN.toLocaleString("en-US");
    var L = [];
    L.push("🏡 新しいアクティビティ予約（要承認）");
    L.push("");
    L.push("🎯 " + name);
    L.push("🗓 " + date + (time ? " " + time : ""));
    if (parts) L.push("👥 " + parts);
    L.push("💴 " + yen);
    if (facility) L.push("🏠 " + facility);
    L.push("");
    L.push("✅ 承認/NG はこちら:");
    L.push(approvalUrl);
    var text = L.join("\n");
    d.textLen = text.length;
    d.textHead = text.slice(0, 60);
    var r = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push",{method:"post",contentType:"application/json",headers:{Authorization:"Bearer "+P.getProperty("LINE_TOKEN")},muteHttpExceptions:true,payload:JSON.stringify({to:P.getProperty("LINE_GROUP_ID"),messages:[{type:"text",text:text}]})});
    d.pushCode = r.getResponseCode();
    d.pushBody = String(r.getContentText()).slice(0,250);
  } catch(e){ d.err = String(e); }
  P.setProperty("DIAG_RESULT", JSON.stringify(d));
}
