# Contributing

ポリシー本文の正本は [taskly-policy](https://github.com/asari194617/taskly-policy) です。このリポジトリの `content/` は UI・ルーティングのテスト用固定データです。本文をここだけで直接変更しても本番には公開されません。

1. 本文変更の必要性と通知・再同意の要否を確認し、`taskly-policy` に新しい保存版を追加します。旧版を上書き・削除しません。
2. `taskly-policy` の `main` にマージします。正本リポジトリの `Publish policy changes` がマージされたコミットを起点に本文とカタログを R2 に公開します。GitHub Actions の実行待ちはあります。失敗時はワークフローを手動実行します。
3. 固定 URL、Markdown、改定履歴、差分を公開 URL で確認します。表示アプリを変更する PR は `npm ci && npm run test:all` を実行し、変更後の画面のスクリーンショットをデスクトップとモバイルで添付してください。CI が画像の添付を検証します。
4. 改定内容が同意記録に関わる場合は、Taskly 本体の版・施行日時・通知・同意フローと整合させます。公開版と同意版が異なる場合は、両方の固定 URL を保持し、変更の理由を明記します。

本文の追加とアプリ機能の変更は別の公開経路です。既存 issue を検索してから新しい issue を起票してください。CI の `required-ci` 成功に加え、公開 URL の HTML、Markdown、noindex ヘッダー、404 を実際に確認します。

デザインには[デジタル庁デザインシステム](https://design.digital.go.jp/dads/)の公式デザイントークン、Tailwindテーマプラグイン、Reactコードスニペットを使用します。採用範囲と更新方法は[docs/design-system.md](docs/design-system.md)を参照してください。文書の見出し階層、下線付きリンク、キーボード操作、明暗テーマ、モバイル表示を維持してください。
