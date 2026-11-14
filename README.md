# Smart Home Dashboard

iPadの横画面で使う、ピクセルアート調のスマートホームダッシュボードです。HTML・CSS・JavaScriptで6画面を構成し、横スワイプと下部タブで切り替えます。

## 起動

Node.js 22以降とnpmを使用します。

```sh
npm ci
npm start
```

**http://127.0.0.1:5173/** を開いてください。Windowsでは `start.cmd` からも起動できます。以前の `/figma.html` も同じUIです。

ローカルサーバーにはこのPCからだけ接続できます。iPad単体で使うCloudflare配信も用意し、本人限定のログインを設定しています。

## 機能

| 画面 | 現在の動作 |
| --- | --- |
| ホーム | 時計、今日の予定、天気・環境値・機器状態の表示 |
| デバイス | 家電の状態切り替え、設定、シーン操作のデモ |
| 音楽 | サンプル曲の切り替え、ブラウザ内で合成した音の再生・停止 |
| トピック | サンプル記事のカテゴリ切り替え・詳細表示 |
| カレンダー | 月送り、日付選択、端末内予定の追加・完了、ホーム反映 |
| 通知 | サンプル通知の絞り込み、既読・一括既読、表示設定 |

UIは確定版です。1440×1080のデザインを画面に合わせて縮小表示します。画面遷移はスライド表示で、動きを減らす端末設定にも対応します。iPad Safari実機での最終確認は未実施です。

家電・天気・環境値・記事・通知はデモです。音楽サービスや実機APIには未接続です。端末内の予定と設定はブラウザに保存され、別端末とは同期されません。

## Googleカレンダー・Cloudflare

読み取り専用のGoogleカレンダー取得、表示中の5分間隔の更新、Cloudflare Accessで本人だけに閲覧を許可する処理を実装しています。**Google OAuth設定・実カレンダー接続は未完了**です。Cloudflareへのデプロイと本人限定のAccess設定は完了し、本人ログイン後のダッシュボード表示も確認済みです。

[Googleカレンダー連携の設定](docs/google-calendar-setup.md)を参照してください。設定項目は `.env.example` に記載しています。実際の秘密値はCloudflare Secretsへ設定し、Gitには保存しません。

```sh
npm run build:cloudflare
npm run check:cloudflare
```

`check:cloudflare` はデプロイを行わないdry-runです。初回構築では閲覧URLを無効化して準備し、Access設定後に有効化します。現在の構成は本人限定のAccess設定後にURLを有効化済みです。WorkerはAccess設定がなければ画面もAPIも拒否します。

## 開発と構成

```sh
npm run build    # テンプレートからHTMLを生成
npm run check    # JavaScript構文確認
npm test         # 状態・予定・認証・家電操作のテスト
```

| 場所 | 役割 |
| --- | --- |
| `templates/` | 確定UIのHTMLの編集元 |
| `figma-exact.js` / `.css` | 共通ナビゲーション・ホーム・画面遷移 |
| `figma-devices.*` / `figma-device-actions.js` | デバイス画面と操作 |
| `figma-pages.js` / `.css` | 音楽・トピック・カレンダー・通知 |
| `state.js` | 端末内の状態と日付処理 |
| `calendar-*` | Googleカレンダーの表示・取得・OAuth |
| `cloudflare-*.mjs` / `wrangler.jsonc` | Cloudflare配信・アクセス制限 |
| `assets/` | 使用中の画像・SVG・フォント |
| `scripts/` | ビルド・検証 |

`index.html` と `figma.html` は生成ファイルです。直接編集せず、`templates/` を変更して `npm run build` を実行してください。Cloudflareの生成物は `cloudflare-dist/` に出力され、Gitの対象外です。

[今回の整理内容](docs/repository-cleanup.md)も参照できます。

## 素材

DotGothic16はSIL Open Font Licenseで配布されています。[フォントライセンス](assets/fonts/OFL.txt)を参照してください。その他の画像・デザインおよびソースコードには、このリポジトリで再配布・再利用のライセンスを設定していません。
