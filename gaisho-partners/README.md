# GAISHO PARTNERS — 3成果物パッケージ

富裕層向け外商コンシェルジュ「GAISHO AI」の基幹インフラを、富裕層接点保有者に開放するプラットフォーム事業のフルパッケージ。

## 構成

| ファイル | 役割 | 用途 |
|---------|------|------|
| `00-master-context.md` | 全プロンプト共通の前提・事業背景 | 3プロンプトの先頭に貼る |
| `01-pitch-deck.md` | 営業資料（16スライド） | パートナー募集ピッチ |
| `02-specification.md` | システム仕様書 v1.0 | エンジニア向け実装仕様 |
| `web/index.html` | パートナー募集 LP | 公開Webサイト |
| `web/dashboard.html` | パートナーダッシュボード | ログイン後画面（モック） |
| `web/admin.html` | 管理者画面 | GAISHO本部用（モック） |

## 動かし方

```bash
# 静的ファイルなのでそのまま開ける
open gaisho-partners/web/index.html
open gaisho-partners/web/dashboard.html
open gaisho-partners/web/admin.html

# またはローカルサーバー
python3 -m http.server 8000 --directory gaisho-partners/web
# → http://localhost:8000/
```

## プロンプト運用フロー

```
[00-master-context.md]  ←  1回作って3回使う
        ↓
[Prompt A: 営業資料]  [Prompt B: 仕様書]  [Prompt C: Webサービス]
        ↓                    ↓                    ↓
   レビュープロンプト（3成果物の相互整合チェック）
```

各成果物は独立して生成・更新可能。Master Context を更新したら3つすべて再生成するのが原則。
