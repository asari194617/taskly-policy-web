# 公開と運用

## 構成

Next.js の `output: "export"` は `out/` に各文書の HTML を生成します。`scripts/publish-markdown.mjs` が `taskly-policy` の Markdown をバイト単位で `out/` に写し、`llms.txt` も生成します。非公開の R2 バケット `taskly-policy-web` に成果物を置き、`policies.taskly.iy0306.com` に割り当てた Worker が `/foo/` を `foo/index.html` に解決します。ログイン、Cookie、API サーバーは必要ありません。

各文書に現行版 `/terms/` のような URL、版固定の `/terms/2026-09-22.1/`、機械可読な `/terms/2026-09-22.1.md` を用意します。`/terms.md` は現行版への Markdown エイリアスです。検索エンジンへの登録は HTML の robots メタタグと Worker の `X-Robots-Tag: noindex` で抑えます。`robots.txt` はクロールを許可し、AI リーダーは Markdown と `llms.txt` を読めます。

## 出典と版

`content/SOURCE_REVISION` は取り込んだ `taskly-policy` のコミットを固定します。`content/catalog.json` は各版の SHA-256、表示名、改訂日または施行日を記録します。CI は同じコミットをチェックアウトし、カタログと全 Markdown のバイト列が一致することを確認します。ビルドも SHA-256 を再計算します。

利用規約・セキュリティポリシーの現行版とプライバシーポリシーの旧版 `2026-09-22.1` は、Taskly が同意記録に使用した保存版です。現在のプライバシーポリシーは `2026-09-23.1` で、公開済みの改訂本文を表示します。Taskly の同意版は別の通知・再同意手順が終わるまで旧版のままです。継続性声明 `88536b5` は元リポジトリのコミット由来のスナップショットであり、施行日を推測していません。

## CI/CD と秘密情報

GitHub-hosted runner で lint、型検査、ユニット・コンポーネント・Worker テスト、Playwright のデスクトップ/モバイル E2E、ビルドを行います。Vitest は実測の行・文・分岐・関数カバレッジを各 80% 以上に制限します。E2E は公開 URL の経路網羅とシナリオ成功率を別に報告します。PR へのカバレッジコメントには各指標と CI URL を載せ、フォーク PR の成果物は実行せず JSON として検証します。

本番デプロイには GitHub Actions secrets `CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_API_TOKEN`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY` が必要です。R2 キーは当該バケットへの書き込みに限定し、Cloudflare API トークンは Worker 編集と関連ゾーンの最小権限にします。値はリポジトリや PR に書きません。秘密情報が足りない場合はデプロイを失敗として表示します。R2 へ `out/` をアップロード後、`cf` CLI で Worker を公開し、公開 URL の HTML、Markdown、404、noindex ヘッダーを検証します。

### 初回の Cloudflare 設定

1. `iy0306.com` の Cloudflare ゾーンと利用するアカウント ID を確認します。`policies.taskly.iy0306.com` が既存の別サービスを指していないことも確認します。
2. 同じアカウントに、公開アクセスを有効にしない R2 バケット `taskly-policy-web` を作成します。Worker の `POLICY_ASSETS` バインディングだけで読み取ります。バケットの `r2.dev` 公開と R2 直接カスタムドメインは不要です。
3. このバケットに限定した R2 の S3 互換 API キーを発行します。CI の `aws s3 sync` には一覧取得・オブジェクト読み書きが必要です。別途、Worker のデプロイとカスタムドメイン設定に必要な Cloudflare API トークンを対象アカウント・ゾーンに限定して発行します。
4. GitHub リポジトリの Actions secrets に上記 4 件を登録します。`CLOUDFLARE_ACCOUNT_ID` は R2 エンドポイントと Worker 配備先の共通アカウント ID です。権限を広げた個人トークンや SSH 鍵を CI に渡さないでください。
5. `worker/cloudflare.config.ts` の `domains` が目的のホスト名であることを確認し、`main` の CI 成功後に Deploy policies ワークフローを確認します。初回の公開 URL 検証が通った後だけ `POLICY_MONITOR_ENABLED=true` を設定します。

ローカルでは `worker/` 内から `cf deploy --dry-run` を実行し、Worker と R2 バインディングのビルドだけを確認できます。これはリモート権限や DNS、実際の R2 オブジェクトを検証するものではありません。

## 監視・復旧

Worker のログ・トレースを有効にし、R2 読み取りエラー時に構造化された `policy_asset_failure` を記録して 503 を返します。公開後は 4 件の現行文書、全保存版と Markdown、`llms.txt`、404、`X-Robots-Tag` を確認します。障害時は直前に確認済みの Git コミットをチェックアウトし、そのコミットの固定した出典から `out/` を再ビルドして R2 にアップロードします。必要に応じて Worker の前版へ戻します。保存版の URL は削除しません。

初回の公開検証が成功したら、GitHub リポジトリ変数 `POLICY_MONITOR_ENABLED=true` を設定し、定期監視ワークフローを有効にします。監視は公開 URL の本文・Markdown・noindex 応答を検査します。失敗時は GitHub Actions の失敗実行と重複排除されたヘルス issue を確認し、R2 のアップロード、Worker ログ・トレース、DNS・証明書を調べます。復旧後は同じ issue に検証結果を残してクローズします。公開前は変数を設定せず、未公開ドメインへの誤報を避けます。

Cloudflare `cf` CLI はベータ版です。API または設定形式の更新時は固定バージョンを確認し、dry run と公開後検証を行います。
