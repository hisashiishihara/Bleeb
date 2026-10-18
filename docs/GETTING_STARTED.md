# aiDiary を自分の ChatGPT Sites で動かす

> 対象: 現行の aiDiary（ChatGPT Sites 専用実装、2026-10-18 時点）。**自動インストーラーやワンクリック導入手順ではありません。** 初回は ChatGPT Sites での構築・認証設定・検証が必要です。このリポジトリを読み取れる GitHub 権限も必要です。

## 費用とプランについて

ChatGPT Sites のホスティングは、**現在 ChatGPT Plus / Pro の契約に含まれます**。既に Plus を使っている人なら、利用枠内で別途 VPS・レンタルサーバー・OpenAI API の契約をせずに aiDiary を運用する構成です。ただし **Plus 自体は有料**で、サイト作成・編集は Codex 利用枠を消費し、トラフィック・ストレージなどに上限があります。アカウントで Sites が使えるか事前に確認してください。独自ドメインなど、追加サービスは別料金になり得ます。提供条件は変わる可能性があります。

- [OpenAI 公式: Creating and using ChatGPT Sites](https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites)
- **新規ユーザー向けの注意:** 以下は実装に基づく導入手順です。独立した第三者によるクリーン環境での導入成功は、現時点で未検証です。既存 Site の本番 DB にマイグレーションを再実行しないでください。

## 1. 何が必要？

- ChatGPT Sites が利用できる ChatGPT アカウント（対象プラン・権限は [公式ガイド](https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites) を参照）。
- aiDiary ソースへのアクセス、および ChatGPT Work（Web）または Work / Codex（デスクトップ）で Sites を編集できる環境。
- サイト所有者としての ChatGPT 認証と、Sites の環境変数・シークレットを構成できる権限。
- 開発者がローカルチェックする場合は Node.js 22.13 以上。一般の読者に Node や ChatGPT は不要です。

現在のアーキテクチャは **ChatGPT Sites + Site-hosted MCP + D1 (DB) + R2 (MEDIA)** です。サイトの閲覧・記事の保存に自前の VPS/NUC、Apache、Python CGI や OpenAI API の別途推論サーバーは使用しません。Sites 自体の利用制限・ストレージ制限には従います。

## 2. コードを Sites に取り込む

1. GitHub のこのリポジトリを開き、アクセスできることを確認します（非公開リポジトリを利用するときは権限が必要）。
2. ChatGPT の Work で Site の作成を依頼するか、Sites 対応の Codex 環境を使います。既存の `app/`、`plugin/`、`lib/`、`drizzle/` と `.openai/hosting.json` を使用し、**静的 HTML や別の CMS に置き換えない**よう依頼します。
3. `.openai/hosting.json` は D1 `DB`、R2 `MEDIA`、`mcp` を宣言しています。Site 側の実際のバインディングを確認し、`drizzle/` の SQL マイグレーションを順に適用します。既存 Site を更新する場合、データを消去・再初期化しないでください。
4. まず所有者のみがアクセスできる Site としてプレビュー・保存します。公開範囲を広げるのは検証後です。

Work / Codex に渡す依頼例:

```text
@Sites GitHub の hisashiishihara/ai-diary を使い、ChatGPT Sites の
新規ブログを構築してください。既存のアプリ構成と D1 DB、R2 MEDIA、
Site-hosted MCP を維持し、架空のテスト記事のみで確認してください。
Site は所有者限定にし、本人認証・シークレット・マイグレーションの
確認が済むまで一般公開しないでください。
```

## 3. 所有者認証を設定する

aiDiary の記事編集・MCP 書き込みは所有者だけに許可します。Site から注入される信頼できる本人情報と照合し、単なる自己申告ヘッダーは信用しません。

- `AI_DIARY_OWNER_EMAIL`: 所有者メールのシークレット。リポジトリや画面の本文に書かず、**Sites の設定**で指定します。
- `AI_DIARY_OWNER_API_ENABLED`: 認証の動作確認後だけ `true` にします。省略・未設定時は書き込み API を拒否します。
- `AI_DIARY_IMAGE_SOURCE_HOSTS`: HTTPS URL から画像を取り込む場合だけ使う許可ホスト一覧。画像を ChatGPT のファイルとして送る場合は通常不要です。

**重要:** デプロイしただけでは安全性を証明できません。署名のないアクセス、偽装 ID/メール、所有者以外の呼び出しを拒否することを確認してください。詳しくは [本人認証テスト](SITES_AUTH_VALIDATION.md) と [メディアの取扱い](EDITOR_MEDIA.md) を参照してください。

## 4. Site の MCP プラグインを接続する

1. 所有者が MCP 対応 Site を発行します。発行しただけでは ChatGPT との接続は完了しません。
2. 表示されるプラグインカードで **Install → Connect** を完了します。見つからない場合は ChatGPT の **Plugins → Personal → Created by you** を確認します。
3. ChatGPT の新しい会話でそのプラグインを指定し、「記事一覧を見せて」「架空の内容を下書き保存して」と依頼して実動作を確認します。
4. 本番の記事を書く前に、下書き保存→編集→プレビュー→明示的な公開→非公開化を架空の記事で試してください。

[OpenAI 公式: Hosting a plugin with ChatGPT Sites](https://help.openai.com/en/articles/20001547-hosting-a-plugin-with-chatgpt-sites)

## 5. 外部にブログを公開するとき

公開には **2つの異なる設定**があります。

1. **記事の可視性**: `owner`（所有者のみ）か `public`（サイトの閲覧者に公開）。
2. **Site の共有範囲**: 所有者限定なら、記事が `public` でもインターネットからアクセスできません。

実際に一般公開する場合は、Site の共有設定を明示的に変更し、匿名アクセスでホーム・記事・メディアが見えること、下書き・所有者限定の記事・編集 API が見えないことをテストしてください。安全性を確認せず公開範囲を広げないでください。Site と記事の公開設定は各自で判断してください。

## 6. ローカルでのソースチェック（開発者向け）

```sh
npm install
npm test
npm run typecheck
npm run build
```

ローカルテストの成功は実際の Sites 認証・D1・R2 や MCP 接続を保証しません。ソースの変更は GitHub に push しただけでは運用中の Site に反映されず、別途 Site の保存・公開が必要です。一方、接続済み aiDiary での記事の追加・編集には、通常、ソースの再デプロイは不要です。

続き: [日常の使い方](USAGE.md) / [既存の運用検証資料](PLATFORM_VALIDATION.md) / [バックアップと再デプロイ](SITES_HANDOFF.md)
