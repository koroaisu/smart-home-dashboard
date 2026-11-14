# CloudflareでiPad単体のGoogleカレンダー連携を動かす

更新：2026-11-14。Cloudflareへの切替準備とローカル検証まで完了。Cloudflareアカウント登録と開発環境の認証は完了。Google Cloud OAuthクライアント作成、本番Access設定・デプロイ・実Google接続は未実施。

## 構成

iPad → Cloudflare Access（本人のみ）→ Workers＋Static Assets → Google Calendar API。

PCの起動や独自ドメインの購入は不要な構成。以前のSitesは移行が確認できるまで変更しない。Cloudflare Workers Freeを使用し、有料プランや有料ストレージは契約しない。無料枠にはリクエスト数とCPU時間の上限があり、本番の消費CPUはデプロイ後に別途確認する。

カレンダー一覧・予定の読み取り専用。ホーム・選択日の予定・日付の印・今後31日へ反映する。Googleに予定を書き込まず、手動追加は端末内に保存する。Googleの予定やトークンはGit・localStorageに保存しない。

認証情報はAES-GCMで暗号化したHttpOnly/Secure Cookieとして保持。復号鍵とGoogleクライアントシークレットはCloudflareのSecretsに置き、ブラウザのJavaScriptへトークンを返さない。30日間利用がなければ再接続が必要。Google側の許可失効・Cloudflare Accessのログイン期限でも再認証が必要になり得る。

表示中は5分ごと、画面復帰時にも取得する。iPadがスリープ中・ブラウザ終了中に定期取得する仕組みではない。失敗時は前回データに更新待ちを表示する。

## 別環境でのCloudflareアカウント準備

[Cloudflareのアカウント登録](https://dash.cloudflare.com/sign-up)で無料アカウントを作り、メール認証を完了してログインする。登録時のパスワード・確認コード・規約への同意は本人が行う。クレジットカードや有料プランは今回の構成に追加しない。

## Cloudflareへの準備済みファイル

- `wrangler.jsonc`：WorkerとStatic Assetsの構成。初期状態は`workers_dev:false`・`preview_urls:false`で閲覧用URLを有効にしない。
- `cloudflare-worker.mjs`：画像・HTML・APIのすべてでAccessの署名検証を行う。
- `cloudflare-access.mjs`：公式例と同じ`jose`で署名・有効期限・発行元・アプリのaudience・本人メールアドレスを検証。メールヘッダーだけでは信用しない。
- `scripts/build-cloudflare.mjs`：必要な35ファイルだけを`cloudflare-dist/public`に出力。秘密値・ローカルデータ・旧資料を含めない。
- `calendar-cloud.mjs`：Google OAuth（state/PKCE・offline）とクラウドでの短期トークン更新。

フォントや画像をWorker内のbase64から復号する方式をやめ、Static Assetsへ分離してCPU処理を減らす。本人限定を維持するため`run_worker_first:true`にし、静的ファイルにも検証を適用する。この構成では静的ファイルへのアクセスもWorker呼び出しになる。

## 登録後の作業順序

1. `wrangler login`で本人のアカウントへCLIを接続し、Freeプランを確認する。
2. 閲覧URLを無効にしたまま初回Workerを作成する。
3. Cloudflare AccessでWorker全体を保護し、許可するメールを本人だけに設定する。チームドメイン・アプリのAUDを確認する。
4. 下表のAccess設定をSecretsへ登録する。未設定・無認証の場合、Workerは画面もAPIも拒否する。
5. 保護の設定確認後に`workers_dev:true`へ変更して反映し、確定したHTTPS URLを記録する。
6. Google Cloudに専用プロジェクトを作り、Calendar APIを有効化する。Google Auth Platformで同意画面を設定し、Webアプリ用OAuthクライアントを作成する。
7. Googleの許可済みリダイレクトURIを、確定したWorker URLの`/api/calendar/callback`へ設定する。
8. Google設定をSecretsに登録し、iPadでGoogle接続・表示するカレンダーの選択・自動更新を確認する。

リダイレクトURIの形：

```text
https://sekhmet-home-dashboard.<自分のサブドメイン>.workers.dev/api/calendar/callback
```

実際のURLが確定するまで、仮のURLや以前のSites URLをGoogleへ登録しない。Cloudflareのアクセス制限を解除して認証を通す対応は行わない。

## Cloudflare Secrets

| 名前 | 値 |
| --- | --- |
| `CF_ACCESS_TEAM_DOMAIN` | `https://<チーム名>.cloudflareaccess.com` |
| `CF_ACCESS_AUD` | このWorkerを保護するAccessアプリのAUD |
| `CALENDAR_OWNER_EMAIL` | 閲覧を許可する本人のメールアドレス |
| `CALENDAR_PUBLIC_ORIGIN` | 確定したHTTPS origin。パスなし |
| `GOOGLE_CLIENT_ID` | Web OAuthクライアントID |
| `GOOGLE_CLIENT_SECRET` | クライアントシークレット |
| `CALENDAR_COOKIE_KEY` | 32バイトの暗号鍵をbase64url化したもの |

SecretsはCloudflareの設定画面または`wrangler secret put <名前>`の非表示入力で登録する。チャット・Git・コマンド引数へ秘密値を貼らない。`.dev.vars`・`.env`・ビルド成果物・Wranglerのローカル状態はGit対象外。

Googleの要求スコープ：

```text
https://www.googleapis.com/auth/calendar.calendarlist.readonly
https://www.googleapis.com/auth/calendar.events.readonly
```

Google OAuthがExternal / Testingのままだと更新用トークンが7日で失効する。常設運用前に本番状態・審査要否を確認する。OAuthアプリの本番化と、サイトの一般公開は別の設定。

## コマンド

```text
npm ci
npm test
npm run build:cloudflare
npm run check:cloudflare
npm run dev:cloudflare
```

`check:cloudflare`はWranglerのdry-runで、本番にアップロードしない。本番への反映は`npm run deploy:cloudflare`。初回はURL無効・アプリ側も未設定拒否の状態で作成し、Access設定を確認してからURLを有効にする。

## 確認済みと未確認

- 整理前に全45テスト成功（削除した旧UI用テストを含む）。Accessの署名・偽造・期限切れ・別ユーザー・別audienceの拒否、認証処理・日時処理・更新競合を確認。
- Wrangler 4.162.0 dry-run成功。Workerバンドルはgzip約16KiB。静的ファイルは別配信。
- workerdのローカル実行で、未設定時にHTML・フォント・APIをすべて503で拒否することを確認。
- 本番Access・本番のCPU消費・Google OAuth・iPad実機は未確認。
- 今回、本番デプロイ・Git pushは行っていない。

## 公式資料

- [Workers料金](https://developers.cloudflare.com/workers/platform/pricing/)
- [Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Cloudflare Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)
- [JWTの検証](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
- [Google WebサーバーOAuth](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google更新用トークンの失効](https://developers.google.com/identity/protocols/oauth2#expiration)
