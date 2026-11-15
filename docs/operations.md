# 公開と運用

## 構成

Next.js の `output: "export"` は共通画面 `/` と `/viewer/` を `out/` に出力します。Cloudflare Worker はポリシーの現行・保存版・履歴・差分 URL を同じ `/viewer/index.html` に解決し、画面は R2 上の `data/catalog.json` と版固定の Markdown を読み込みます。Worker は `/<slug>.md` と `llms.txt` も現行カタログから解決します。新しい版や文書を追加しても、Next.js のビルドや Worker のデプロイは不要です。

`/<slug>/?v=<version>` も受け付け、既存の版固定URL `/<slug>/<version>/` へリダイレクトします。未知の版は404、不正な値や重複した `v` は400です。Taskly の同意記録が参照する版固定URLは維持します。現在のカタログは文書ごとの版を管理するため、全規約をまとめた単一のRelease版を選ぶ `/?v=` は提供しません。

R2 バケット `taskly-policy-web` は非公開です。Worker の `POLICY_ASSETS` バインディングだけで読み取ります。HTML と Markdown に `X-Robots-Tag: noindex`、HTML に robots メタタグを付けます。Markdown と `llms.txt` は AI リーダー向けに公開します。ログイン、Cookie、アプリケーションサーバーはありません。

## 本文・版の公開

正本は [taskly-policy](https://github.com/asari194617/taskly-policy) の `main` です。`catalog.json` は文書、現行版、版ごとの原文 SHA-256 を指定します。版固定ファイル `versions/<version>/<slug>.md` は公開後に変更・削除しません。

凍結中の `taskly-front` 設計は GitHub Releases と版ごとの `manifest.json` を想定していました。現在の正本にはReleaseがなく、Tasklyの同意記録は文書ごとの版を保持します。そのため、このサイトは GitHub 上の `catalog.json` を一覧・現行版の正本とし、R2を公開用の検証済み複製として使います。Release単位の予定版管理は、このカタログにはまだありません。

正本リポジトリの `Publish policy changes` は `main` の本文・カタログ変更を起点に、このリポジトリの再利用可能な `Publish policy data` を呼び出します。定期確認を待たずに公開を開始し、後者は手動再実行もできます。`scripts/prepare-data.mjs` が版 ID・ファイルパス・原文ハッシュを検証し、表示用 Markdown のハッシュ `publishedSha256` をカタログに加えます。前回公開したカタログと比較して保存版の変更・削除を拒否します。版固定の Markdown を先に R2 に配置し、正本の `main` が同じコミットを指すことを確認してから `data/catalog.json` を公開します。R2 の Worker バインディングは書き込み直後の値を一貫して読めるため、カタログが指す版のファイルを先に用意します。公開後は現行版の本文ハッシュとカタログを公開 URL から検証します。

`content/` は表示アプリのテスト用固定データです。本番の文書更新には使いません。アプリの `Deploy policies` は Next.js の静的ファイルと Worker だけを公開し、Markdown と `data/catalog.json` を上書きしません。

利用規約・セキュリティポリシーの現行版とプライバシーポリシーの旧版 `2026-09-22.1` は、Taskly が同意記録に使用した保存版です。現在のプライバシーポリシーは `2026-09-23.1` です。同意を義務付ける版の変更は Taskly API、告知、同意画面の版を合わせてから `catalog.json` の現行版を切り替えます。継続性声明 `88536b5` には発効日を推測していません。

## CI/CD と秘密情報

GitHub-hosted runner で lint、型検査、ユニット・コンポーネント・Worker テスト、Playwright のデスクトップ/モバイル E2E、ビルドを行います。Vitest は行・文・分岐・関数カバレッジを各 80% 以上に制限します。ブラウザだけで動作するカタログ取得フックは Playwright で検証します。PR のカバレッジコメントには測定値と CI URL を載せます。

アプリのデプロイには GitHub Actions secrets `CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_API_TOKEN`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY` が必要です。データ公開には同じアカウント ID と R2 のキーだけを使います。R2 キーは当該バケットへのアクセスに限定します。秘密情報をリポジトリや PR に書きません。

## 監視・復旧

Worker のログとトレースを有効にしています。R2 読み取りエラー時は構造化ログを残して 503 を返します。定期監視は **本番の** カタログを読み、すべての文書・保存版 URL と Markdown の公開ハッシュ、`llms.txt`、404、`X-Robots-Tag` を検査します。アプリのリポジトリに固定した旧カタログとは比較しません。障害時は監視 issue と Worker のログ、R2 オブジェクト、DNS・証明書を確認します。

データ公開に失敗した場合、カタログは最後に公開されるため、直前のカタログが現行のまま残ります。旧版オブジェクトは削除しません。アプリの復旧は前の Worker 版と静的ファイルを再公開します。必要に応じて `Publish policy data` を手動実行し、公開後の監視が正常になることを確認します。
