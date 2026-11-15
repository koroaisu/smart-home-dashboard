# CloudflareでiPad単体のGoogleカレンダー連携を動かす

更新：2026-11-15。Cloudflare Accessの本人限定ポリシーとアプリを保存し、WorkerのURLを有効化済み。未認証リクエストの保護を確認。本人ログイン後のダッシュボード表示を本人が確認済み。Google Cloudプロジェクト作成とCalendar API有効化まで完了。OAuth同意画面作成まで完了。Web OAuthクライアントを作成し、GoogleクライアントID・シークレット・Cookie暗号鍵をCloudflare Secretsへ登録済み。GoogleアプリはTestingで、初回接続と長期利用向けの本番設定は未完了。

## 構成

iPad → Cloudflare Access（本人のみ）→ Workers＋Static Assets → Google Calendar API。

PCの起動や独自ドメインの購入は不要な構成。以前のSitesは移行が確認できるまで変更しない。Cloudflare Workers Freeを使用し、有料プランや有料ストレージは契約しない。無料枠にはリクエスト数とCPU時間の上限があり、本番の消費CPUはデプロイ後に別途確認する。

カレンダー一覧・予定の読み取り専用。ホーム・選択日の予定・日付の印・今後31日へ反映する。Googleに予定を書き込まず、手動追加は端末内に保存する。Googleの予定やトークンはGit・localStorageに保存しない。

認証情報はAES-GCMで暗号化したHttpOnly/Secure Cookieとして保持。復号鍵とGoogleクライアントシークレットはCloudflareのSecretsに置き、ブラウザのJavaScriptへトークンを返さない。30日間利用がなければ再接続が必要。Google側の許可失効・Cloudflare Accessのログイン期限でも再認証が必要になり得る。

表示中は5分ごと、画面復帰時にも取得する。iPadがスリープ中・ブラウザ終了中に定期取得する仕組みではない。失敗時は前回データに更新待ちを表示する。

## 別環境でのCloudflareアカウント準備

[Cloudflareのアカウント登録](https://dash.cloudflare.com/sign-up)で無料アカウントを作り、メール認証を完了してログインする。登録時のパスワード・確認コード・規約への同意は本人が行う。有料プランは契約しない。ただしZero Trust Freeの初回有効化でも支払い方法・請求先の登録が必要。2026-11-14、公式資料と実際の無料プラン登録画面で確認。カード情報等は本人がブラウザで入力する。

## Cloudflareへの準備済みファイル

- `wrangler.jsonc`：WorkerとStatic Assetsの構成。初回構築時は`workers_dev:false`・`preview_urls:false`。現在はAccess設定後に`workers_dev:true`へ変更済み。プレビューURLは無効のまま。
- `cloudflare-worker.mjs`：画像・HTML・APIのすべてでAccessの署名検証を行う。
- `cloudflare-access.mjs`：公式例と同じ`jose`で署名・有効期限・発行元・アプリのaudience・本人メールアドレスを検証。メールヘッダーだけでは信用しない。
- `scripts/build-cloudflare.mjs`：必要な35ファイルだけを`cloudflare-dist/public`に出力。秘密値・ローカルデータ・旧資料を含めない。
- `calendar-cloud.mjs`：Google OAuth（state/PKCE・offline）とクラウドでの短期トークン更新。

フォントや画像をWorker内のbase64から復号する方式をやめ、Static Assetsへ分離してCPU処理を減らす。本人限定を維持するため`run_worker_first:true`にし、静的ファイルにも検証を適用する。この構成では静的ファイルへのアクセスもWorker呼び出しになる。

## 登録後の作業順序

1. `wrangler login`で本人のアカウントへCLIを接続し、Freeプランを確認する。Zero Trust Freeも別途有効化する。Workers認証とAccessの有効化は別の手続き。
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
- [Zero Trust初期登録・支払い情報の要件](https://developers.cloudflare.com/cloudflare-one/setup/)
- [JWTの検証](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
- [Google WebサーバーOAuth](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google更新用トークンの失効](https://developers.google.com/identity/protocols/oauth2#expiration)

## 2026-11-15の進捗

Zero Trust Freeの登録完了を本人の回答と管理画面で確認。Worker sekhmet-home-dashboardを初回アップロードした（バージョン4777e9db-bf64-46ed-aedd-d749d2fdd8c3）。workers_dev:false・preview_urls:falseを維持し、CLIもNo targets deployedを返した。閲覧用URLはまだ有効化していない。MCP接続は最小権限のためAccess設定の参照・編集には追加承認が必要。

### 開発用MCPの権限更新

2026-11-15、本人承認によりMCPのAccessアプリ・ポリシー編集、組織・認証方法編集、Workersスクリプト読み取りを追加。OAuth成功をCLIで確認済み。スコープ名はworkers-scripts.read、access.write、access-acct.write（user:read等の基本スコープとは区切り文字が異なる）。読み込み済みのMCP接続には旧トークンが残ることがあるため、その場合は接続を再読込する。権限をもう一度付与する必要はない。

## 2026-11-15：本人限定URLを有効化

Accessアプリ「Sekhmet Home Dashboard」を作成し、本人の登録メール1件だけをAllowにした再利用可能なポリシーを関連付けた。対象は専用Workerの本番・プレビューURLと本番の完全ホスト名。アプリのセッション期間は1か月（上位のセッション期限が優先）。ログイン方法はCloudflareアカウント。

WorkerのSecretsにAccess発行元・AUD・本人メール・公開originを登録後、workers_dev:trueで反映。バージョン4ba2ed52-b2a1-4dce-91da-ba0625a04347。未認証の /・/figma.html・フォント・/api/calendar/status がすべて302でAccessログインへ転送されること、Access公開鍵が200で取得できることを確認した。本人ログイン後の画面表示・iPad実機は確認待ち。

別のアカウントへ構築するときは、自分のWorkerとAccessアプリを作成してSecretsを設定する。GoogleのクライアントID・シークレット・Cookie暗号鍵はまだ登録していないため、Googleカレンダーは未接続。

## 2026-11-15：Google Cloudの準備

本人がCloudflareログイン後のダッシュボード表示とGoogle Cloud初回利用規約への同意を完了。専用プロジェクトSekhmet Calendar（ID: sekhmet-calendar）を作成し、Google Calendar APIのステータスが有効になったことを確認した。無料トライアル・課金アカウントは申し込んでいない。作成直後は一時的に権限エラーが表示されたが、反映後はAPI画面を正常に開けた。

Google Auth Platformはアプリ名Sekhmet Calendar、対象External、本人のサポート・連絡先メールを入力済み。ユーザーデータポリシー同意と作成は本人に依頼中。OAuthクライアントとGoogleのSecretsはまだ作成・登録していない。

### OAuthクライアントの準備

Google Auth Platformの作成完了を管理画面で確認。Webクライアント名Sekhmet Dashboard Web、承認済みリダイレクトURIは専用Workerの /api/calendar/callback だけを入力。JavaScript生成元は使用しないため空欄。AI搭載エージェントのチェックは付けない。OAuthクライアントの作成とCloudflare Secretsへの認証情報登録は本人の承認待ちで、まだ発行していない。

## 2026-11-15：OAuth認証情報を登録

本人承認後、WebクライアントSekhmet Dashboard Webを作成。JSONのプロジェクトとリダイレクトURIが専用プロジェクト・専用Workerのcallback1件だけであることを検証し、GOOGLE_CLIENT_ID・GOOGLE_CLIENT_SECRET・32バイトから生成したCALENDAR_COOKIE_KEYをWorkerのSecretsへ登録した。secret listで必要な全7項目の存在を確認した。値はGitやチャットに出力していない。ダウンロードした一時JSONはリポジトリ外でWindowsユーザー単位のDPAPI暗号化に置き換え、平文ファイルの不在を確認した。

Google側の公開状態はまだTesting。本人のテストユーザー登録は未実施。長期利用にはProductionへの切替が必要だが、Audienceの公開ボタンはBranding構成完了待ちで無効だった。ホームページURLは補完・保存したが、プライバシーポリシー等の公開情報の用意と確認が残っている。未認証ユーザーへダッシュボードやカレンダーを公開する変更は行わない。初回Google同意・予定取得・長期更新の実動作は未確認。

参考：[Google OAuthポリシー](https://developers.google.com/identity/protocols/oauth2/policies)、[個人利用の確認免除](https://support.google.com/cloud/answer/13464323?hl=en)。個人利用の確認免除と、アプリ情報の設定・公開ステータスは区別する。

## 2026-11-15：Google向け公開説明ページ

本人承認により、本体とは別の静的Worker sekhmet-calendar-infoへ説明・プライバシーポリシーを公開した。設定はwrangler.calendar-info.jsonc、公開対象はcalendar-info/のHTML2枚・CSS・ヘッダーだけ。秘密値・予定API・ダッシュボード資産は含めない。

- ホームページ：https://sekhmet-calendar-info.kouro-tanabe.workers.dev/
- プライバシーポリシー：https://sekhmet-calendar-info.kouro-tanabe.workers.dev/privacy
- 反映バージョン：aa98a920-e854-4546-828e-f4b3a6bf11a4

両ページの未認証200、説明ページからポリシーへのリンク、公開サイトの予定API404、本体のAccess302を確認。静的サイトではhtml_handling:noneだとルートがindex.htmlへ解決されず404になったため、auto-trailing-slashへ修正した。本体の設定は変更しない。GoogleへのURL登録・本番化・初回接続は未完了。
