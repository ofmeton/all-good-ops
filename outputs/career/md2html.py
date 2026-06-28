#!/usr/bin/env python3
# 職務経歴書 Markdown -> 整形HTML（A4印刷想定・日本語）
import sys, html, re

src, dst = sys.argv[1], sys.argv[2]
lines = open(src, encoding="utf-8").read().split("\n")

def inline(t):
    t = html.escape(t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    return t

out = []
i = 0
n = len(lines)
while i < n:
    line = lines[i]
    s = line.rstrip()
    if s.strip() == "":
        i += 1; continue
    if s.startswith("# "):
        out.append(f"<h1>{inline(s[2:])}</h1>")
    elif s.startswith("## "):
        out.append(f"<h2>{inline(s[3:])}</h2>")
    elif s.startswith("### "):
        out.append(f"<h3>{inline(s[4:])}</h3>")
    elif s.startswith("- "):
        items = []
        while i < n and lines[i].lstrip().startswith("- "):
            items.append(f"<li>{inline(lines[i].lstrip()[2:])}</li>")
            i += 1
        out.append("<ul>" + "".join(items) + "</ul>")
        continue
    elif s.lstrip().startswith("■"):
        out.append(f'<p class="card">{inline(s.strip())}</p>')
    elif s.startswith("**") and s.endswith("**"):
        out.append(f'<p class="grp">{inline(s)}</p>')
    else:
        out.append(f"<p>{inline(s)}</p>")
    i += 1

body = "\n".join(out)
css = """
@page { size: A4; margin: 13mm 14mm; }
* { box-sizing: border-box; }
body { font-family: "Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;
  color:#1a1a1a; font-size:10pt; line-height:1.5; margin:0; }
h1 { font-size:16pt; text-align:center; margin:0 0 3px; letter-spacing:1px; }
h2 { font-size:11.5pt; margin:13px 0 6px; padding:4px 10px; background:#2b3a4a; color:#fff;
  border-radius:2px; }
h3 { font-size:10.3pt; margin:10px 0 4px; padding-bottom:2px; border-bottom:1.5px solid #2b3a4a;
  color:#1d2a36; }
p { margin:3px 0; }
p.grp { font-weight:700; margin:8px 0 2px; color:#2b3a4a; }
p.card { font-weight:700; margin:6px 0 1px; padding-left:2px; }
ul { margin:2px 0 5px; padding-left:1.25em; }
li { margin:1px 0; }
p.card + ul { margin-top:1px; }
p.card + p { margin-top:1px; }
strong { font-weight:700; }
"""
htmldoc = f"""<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8">
<style>{css}</style></head><body>
{body}
</body></html>"""
open(dst, "w", encoding="utf-8").write(htmldoc)
print("wrote", dst)
