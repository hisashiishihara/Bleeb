# Bleeb

**Your ChatGPT is your blog editor.** 🐸

ChatGPT との会話で記事を書き、修正し、公開する小さな OSS ブログエンジン。ChatGPT Sites と Site-hosted MCP に特化した、旧 **aiDiary** プロジェクトです。

**ChatGPT Plus / Pro の Sites 利用枠内なら、追加の VPS やレンタルサーバーを契約せずに運用できます。** 別途 OpenAI API の従量課金も前提にしません。※ Plus 自体は有料で、Sites の提供条件・利用枠・ストレージ上限、独自ドメイン等の費用は別です。

- **会話で操作** — 下書き・編集・画像設定・公開・非公開化
- **Sites で完結** — 記事は D1、画像・動画は R2
- **とにかく小さく** — 既存機能を優先し、リファクタリングではコード量と複雑さを削減。安全性と可読性は維持

## はじめる

[導入ガイド](docs/GETTING_STARTED.md) · [使い方](docs/USAGE.md) · [開発 TODO](docs/ROADMAP.md) · [設計](docs/DESIGN.md)

各自の ChatGPT Sites での初期構築と MCP 接続が必要です。ワンクリック導入ではありません。公開前に所有者認証と非公開記事のアクセス制御を検証してください。

[公式 Sites ガイド](https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites) · [公開前チェックリスト](docs/PUBLIC_RELEASE_CHECKLIST.md)

## ライセンス

[BSD-3-Clause](LICENSE)。コードは改変・再配布・商用利用可能です（ライセンス条件に従ってください）。記事・画像の著作権は各権利者に帰属します。
