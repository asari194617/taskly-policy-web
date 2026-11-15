# 公開と運用

## 構成

Next.js の `output: "export"` は共通画面 `/` と `/viewer/` を `out/` に出力します。Cloudflare Worker はポリシーの現行・保存版・履歴・差分 URL を同じ `/viewer/index.html` に解決し、画面は R2 上の `data/catalog.json` と版固定の Markdown を読み込みます。Worker は `/<slug>.md` と `llms.txt` も現行カタログから解決します。新しい版や文書を追加しても、Next.js のビルドや Worker のデプロイは不要です。

`/<slug>/?v=<文書の版>` と `/<slug>/?v=<Release tag>` を受け付け、既存の版固定URL `/<slug>/<文書の版>/` へリダイレクトします。`/?v=<Release tag>` はそのReleaseの文書一覧へ移動します。未知の版は404、不正な値や重複した `v` は400です。Taskly の同意記録が参照する版固定URLは維持します。

R2 バケット `taskly-policy-web` は非公開です。Worker の `POLICY_ASSETS` バインディングだけで読み取ります。HTML と Markdown に `X-Robots-Tag: noindex`、HTML に robots メタタグを付けます。Markdown と `llms.txt` は AI リーダー向けに公開します。ログイン、Cookie、アプリケーションサーバーはありません。

## 本文・版の公開

正本は [taskly-policy](https://github.com/asari194617/taskly-policy) の GitHub Releases です。各tagが固定するコミットの `manifest.json` は文書順、状態、公開日、施行日、個別文書の改定情報と原文SHA-256を指定します。版固定ファイル `versions/<文書の版>/<slug>.md` は公開後に変更・削除しません。

凍結中の `taskly-front/docs/features/policy.md` のReleaseとmanifestによる版管理を、R2静的配信に合わせて適用します。通常Releaseのうち施行済みで最も新しいものを現行版とし、pre-releaseを改正予定版として保持します。各tagをコミットSHAに解決してからmanifestと本文を取得するため、tagが後で動いても公開済みの保存版はR2上で固定されます。GitHubまたは検証が失敗した場合、直前の正常なR2データが表示されます。Next.jsのRoute HandlerとWebhookキャッシュ破棄は、静的配信のため使用しません。GitHubのReleaseイベントで公開を開始し、定期照合でイベント失敗を補います。

正本リポジトリの `Publish policy changes` はRelease公開イベントを起点に、このリポジトリの再利用可能な `Publish policy data` を呼び出します。定期照合と手動再実行もできます。`scripts/release-source.mjs` がGitHub Releases一覧、各tagの固定コミット、manifest、本文ハッシュと改定フラグを検証して表示用カタログを生成します。`scripts/prepare-data.mjs` は表示用Markdownのハッシュ `publishedSha256` を加えます。前回公開したカタログと比較して保存版の変更・削除を拒否します。版固定のMarkdownを先にR2へ置き、`data/catalog.json`を最後に公開します。公開後は現行版の本文ハッシュとカタログを公開URLから検証します。

`content/` は表示アプリのテスト用固定データです。本番の文書更新には使いません。アプリの `Deploy policies` は Next.js の静的ファイルと Worker だけを公開し、Markdown と `data/catalog.json` を上書きしません。

利用規約・セキュリティポリシーの現行版とプライバシーポリシーの旧版 `2026-09-22.1` は、Taskly が同意記録に使用した保存版です。現在のプライバシーポリシーは `2026-09-23.1` です。同意を義務付ける版の変更は Taskly API、告知、同意画面の版を合わせてから `catalog.json` の現行版を切り替えます。継続性声明 `88536b5` には発効日を推測していません。

## CI/CD と秘密情報

GitHub-hosted runner で lint、型検査、ユニット・コンポーネント・Worker テスト、Playwright のデスクトップ/モバイル E2E、ビルドを行います。Vitest は行・文・分岐・関数カバレッジを各 80% 以上に制限します。ブラウザだけで動作するカタログ取得フックは Playwright で検証します。PR のカバレッジコメントには測定値と CI URL を載せます。

アプリのデプロイには GitHub Actions secrets `CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_API_TOKEN`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY` が必要です。データ公開には同じアカウント ID と R2 のキーだけを使います。R2 キーは当該バケットへのアクセスに限定します。秘密情報をリポジトリや PR に書きません。

## 監視・復旧

Worker のログとトレースを有効にしています。R2 読み取りエラー時は構造化ログを残して 503 を返します。定期監視は **本番の** カタログを読み、すべての文書・保存版 URL と Markdown の公開ハッシュ、`llms.txt`、404、`X-Robots-Tag` を検査します。アプリのリポジトリに固定した旧カタログとは比較しません。障害時は監視 issue と Worker のログ、R2 オブジェクト、DNS・証明書を確認します。

データ公開に失敗した場合、カタログは最後に公開されるため、直前のカタログが現行のまま残ります。旧版オブジェクトは削除しません。アプリの復旧は前の Worker 版と静的ファイルを再公開します。必要に応じて `Publish policy data` を手動実行し、公開後の監視が正常になることを確認します。
