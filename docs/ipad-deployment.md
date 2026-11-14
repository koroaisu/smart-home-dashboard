# iPad版の公開記録

公開成功：2026-11-09（日本時間）。Sitesの本人限定公開。

URL：https://sekhmet-home-dashboard.thrivingporcupine2.chatgpt.site

- project_id: appgprj_6af09490ecfc81918da87c11167d6d89
- version_id: appgprj_6af09490ecfc81918da87c11167d6d89~appgver_ad3d543b0f74819191469cfac922f9cc
- deployment_id: appgdep_6af0f34a9f60819184c2509f55f3131d
- commit_sha: 43601c9239586165ba4380c3507f4b0a1da6e3c6
- source: hosted-ipad/

公開ツールのsucceededとURLを確認。iPad実機での閲覧は未確認。アクセス設定は所有者1名のみ。

画面・モック操作・ブラウザ保存を静的ホスティング。PCのWindowsメディア情報取得は未接続表示へ置換。PCの予定、開発メモ、ローカルAPIはアップロード対象に含めていない。予定はiPad等の各ブラウザのlocalStorageへ保存され、別端末と同期しない。

このURLをiPadで開く。認証画面が出た場合は同じChatGPTアカウントでログインする。デプロイ成功は、iPad実機のSafari・スワイプ・ログイン検証とは区別する。

## 2026-11-09：NES.css版の更新成功

- commit_sha: 6cf0bccc8abada1d4ff373642b84e47b39ad8f8c
- version_id: appgprj_6af09490ecfc81918da87c11167d6d89~appgver_e570c1ac0f708191ab8998aeb9ffc86c
- deployment_id: appgdep_6af0f726be208191b26ecf69ba6da768
- 状態：succeeded。同じ本人限定URLを維持。
- NES.css 2.3.0を同梱。枠・吹き出し・ボタン・フォーム・dialogへ適用。
- Nodeテスト8件、構文、ID重複なしを確認。Workのローカルブラウザ操作が無効のため更新後の視覚QAは未実施。

## 2026-11-09：DotGothic16の統一

- commit_sha: f7394a220d367d65b5dfc3e835a2b9f876169be5
- version_id: appgprj_6af09490ecfc81918da87c11167d6d89~appgver_f62ebc2c27088191bfe4ea99b4e034be
- deployment_id: appgdep_6af0f9f77a448191805af60d452a8590
- 状態：succeeded。本人限定URLを維持。
- 同梱フォントのCSS名をDotGothic16とし、NES.css部品を含む文字へ明示適用。CSSのクエリ文字列を更新。
- フォント宣言とCSS差分を確認。ブラウザ操作無効のため実表示は未確認。

## 2026-11-09：固定フレーム・ピクセルアイコン版

- commit_sha: 759a412e73703eb157dc5eaf0f01ee6b5effd291
- version_id: appgprj_6af09490ecfc81918da87c11167d6d89~appgver_11a32bf68f748191ac6783ac77bbeef3
- deployment_id: appgdep_6af0fff667e88191928cc48164e59566
- 状態：succeeded。同じ本人限定URLを維持。
- ヘッダー・フッターの占有行を固定し、本文だけをスクロール。狭い画面は情報を再配置。
- ナビ・家電・天気・位置・全画面・追加・閉じるを16×16のピクセルSVGへ変更。
- Nodeテスト9件と構文・DOM確認成功。ブラウザ操作が無効のため実表示・iPad実機は未確認。
