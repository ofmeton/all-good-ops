#!/bin/zsh
# 木曜 19:00: 翌朝の週次資金チェックの前に、MF の「現金」を今の額に直すよう促す。
set -euo pipefail
exec "$HOME/.local/bin/milla-oc-notify" INFO "明日（金）7:00 に週次の資金チェックを回します。マネーフォワードの「現金」を今の手持ちの額に直しておいてください（PayPay は自動で取れます）。 https://moneyforward.com/bs/portfolio" mf-cash-remind
