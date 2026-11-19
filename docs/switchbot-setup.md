# SwitchBot API連携（準備中）

電球①〜④をすべて天井照明へ割り当て、電源・明るさ1〜100%・色温度（電球色2700K、昼白色5000K、昼光色6500K）の操作を実装しました。実認証による4灯の状態取得は確認済み。操作はモックで検証し、認証情報のCloudflare Secrets登録と本番反映まで完了しています。実機への操作送信は未実施です。作業ブランチは `feature/switchbot-api`。

## ローカルの認証設定

Git対象外の `.env.switchbot` に `SWITCHBOT_TOKEN` と `SWITCHBOT_SECRET` を設定します。`SWITCHBOT_DEVICE_MAP` には `{"ceiling":["機器ID", "機器ID"]}` のJSONを設定します。IDの実値をGitへ保存しません。今回のローカル設定では、ユーザー指定により電球①〜④をceilingへ登録済みです。値はチャット・ソース・ログに貼り付けません。このファイルは静的配信ファイル一覧にも含まれません。

Node.js 22以降で次を実行すると、読み取り専用で機器一覧を確認できます。コマンド送信は行いません。

```sh
node scripts/check-switchbot.mjs
```

`npm start` はこのファイルをローカルで読み込みます。本番では同名のCloudflare Secretsを使います。`.env.switchbot` は本番へ自動送信されません。Workerの `/api/switchbot/status`、`/api/switchbot/devices`、`/api/switchbot/state`、`/api/switchbot/commands` は既存のAccess本人認証の後に処理します。操作POSTは同一Originとapplication/jsonを必須とし、サーバー設定済みのceilingと許可コマンドしか受け付けません。

## 更新・操作の動作

表示中5分間隔と復帰時に4灯の状態を取得します。機器画面右上の状態更新ボタンでも取得できます。スライダーは指を離した時だけ送信し、400ms内の連続変更は最後の値に集約します。送信中の操作も直列化し、同一設定の待ち行列は最後の値だけ保持します。API受付後は「送信済み・確認待ち」とし、2秒後に状態を読み直します。4灯のうち一部が失敗した場合は成功扱いにせず、自動で操作を再送しません。異なる値は混在として示し、明るさは平均です。

シーンは天井照明4灯だけに送ります。くつろぐ＝点灯＋20%＋電球色、おやすみ・おでかけ＝消灯です。フロアランプ等はデモとして表示し、SwitchBotへ送りません。玄関ライトはクラウド操作が無効なため対象外です。

Wi-Fi/Bluetooth機器と赤外線リモコンでは機能と状態取得が異なります。別機種を追加するときは公式仕様とAPI上の機種を確認してから対応させてください。

## 検証

2026-11-16（日本時間）、実APIで4灯すべての状態取得に成功。全63テスト、構文チェック、Cloudflare dry-run成功。静的配信52ファイルに認証値が含まれないことも確認。ブラウザ描画・iPad実機・実機操作送信は未確認です。本人承認後にSecrets3項目を登録し、本番バージョン b6b661c6-b950-45d4-b400-477533ebbcb9 へ反映。画面・JS・SwitchBot API各パスで未認証アクセスがAccessへ302になることを確認済みです。ログイン後の本番操作とiPad実機は未確認です。

公式仕様：https://github.com/OpenWonderLabs/SwitchBotAPI

## 2026-11-19：公開環境の「状態未確認」を修正

状態取得のfetchに指定した `redirect: 'error'` がWorkersでは未対応で、リクエスト送信前にTypeErrorになっていました。Nodeのモックテストだけでは見つけられなかったため、workerdでRequestを組み立てる回帰テストを追加しました。

`redirect: 'manual'` と既存の非2xx拒否処理を組み合わせ、認証情報をリダイレクト先へ転送しない動作を保ちました。全65テストとdry-run成功。`node scripts/diagnose-switchbot-runtime.mjs` ではローカル設定をメモリ内で渡したworkerdから実APIを読み取り、修正前0/4灯、修正後4/4灯を確認しています。診断スクリプトは実機への操作を行いません。

修正版は本番 `5d204181-3bbc-4e86-9e6a-25f96e065bf2` へ反映済み。Access保護も保持。ログイン済みの本番画面・iPadでの最終確認は未実施です。

根拠：https://developers.cloudflare.com/workers/runtime-apis/request/#constructor

v1.1署名は公式JavaScript例に従い、token + timestamp + nonceのHMAC-SHA256をBase64化します。トークンはサーバー内だけで扱います。
