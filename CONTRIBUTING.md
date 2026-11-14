# Contributing

ポリシー本文の正本は [taskly-policy](https://github.com/asari194617/taskly-policy) です。このリポジトリの `content/` は、特定コミットから取り込んだ公開用スナップショットです。本文をここだけで直接変更しないでください。

1. 本文変更の必要性と通知・再同意の要否を確認し、`taskly-policy` に新しい保存版を追加します。旧版を上書き・削除しません。
2. 承認された版を `content/` に取り込み、`content/SOURCE_REVISION` を出典コミットの SHA に更新します。`node scripts/verify-content.mjs` と `node scripts/verify-upstream.mjs <checkout>` を実行します。
3. `npm ci && npm run test:all` を実行します。PR には変更後の画面のスクリーンショットを Markdown 画像で添付してください。デスクトップとモバイル、必要な場合は明暗両テーマを示します。CI が画像の添付を検証します。
4. 改定内容が同意記録に関わる場合は、Taskly 本体の版・施行日時・通知・同意フローと整合させます。公開版と同意版が異なる場合は、両方の固定 URL を保持し、変更の理由を明記します。

画面と運用設定の変更は別 PR を推奨します。既存 issue を検索してから新しい issue を起票してください。CI の `required-ci` 成功に加え、公開 URL の HTML、Markdown、noindex ヘッダー、404 を実際に確認します。

デザインは[デジタル庁デザインシステム](https://design.digital.go.jp/dads/)の日本語の可読性とアクセシビリティ指針を参考にした独自実装です。文書の見出し階層、下線付きリンク、キーボード操作、明暗テーマ、モバイル表示を維持してください。
