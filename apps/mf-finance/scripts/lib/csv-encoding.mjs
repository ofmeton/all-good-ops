// Money Forward のCSVは環境により UTF-8 / Shift_JIS のどちらでも出力される。
// UTF-8を厳格に試し、失敗した場合だけShift_JISへフォールバックする。
export function decodeMfCsv(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  try {
    return stripBom(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return stripBom(new TextDecoder("shift_jis", { fatal: true }).decode(bytes));
  }
}

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}
