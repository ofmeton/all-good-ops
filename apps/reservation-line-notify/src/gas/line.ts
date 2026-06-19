function prop(k: string): string {
  const v = PropertiesService.getScriptProperties().getProperty(k);
  if (!v) throw new Error(k + " プロパティ未設定");
  return v;
}

export function pushLine(text: string): boolean {
  const res = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + prop("LINE_TOKEN") },
    muteHttpExceptions: true,
    payload: JSON.stringify({
      to: prop("LINE_GROUP_ID"),
      messages: [{ type: "text", text: text.slice(0, 4900) }], // LINE上限5000字
    }),
  });
  const code = res.getResponseCode();
  if (code !== 200) {
    console.warn(`LINE push failed: ${code} ${res.getContentText()}`);
    return false;
  }
  return true;
}
