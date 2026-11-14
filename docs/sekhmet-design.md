# セクメトのホーム画面

2026-11-08。本人提供の1枚目をキャラクター、2枚目を画面構成・配色の参考として使用。

- 大きな時計と日付を左上、天気サンプルを右上に配置。
- 中央にセクメトと「話しかける」。背景はベージュ、操作色はオリーブ。
- 照明・Fire TV・予定・ニュースを入口にし、詳細はダイアログで表示。
- 照明と予定は既存のローカル操作を維持。家電メニューから環境値と掃除機デモを開く。
- 600px以下ではアバターの下の入口を2列にする。
- Fire TV、ニュース、AI会話、実機操作は未接続。固定メッセージは明示し、マイク権限を要求しない。

## 画像

組み込みimage_genツールで提供画像を透過背景の素材に編集。AI編集のため元画像との画素単位の同一性は保証しない。RGBA PNG、1276×1233。保存先：`assets/sekhmet.png`。

使用プロンプト：

> Use case: background-extraction. Edit target: the supplied image of Sekhmet, a seated golden Egyptian cat mascot. Remove ONLY the temple background, carpet and floor. Produce a genuinely transparent-background PNG cutout containing the complete single character: preserve the exact facial expression, fur, crown and sun disk, gold-and-blue headdress, white robes, jewelry, ankh staff, both seated feet and curved tail. Preserve the original identity, proportions, colors and high quality 3D rendered style. Full body with nothing clipped, tightly framed with small transparent padding. No text, no new props, no background, no UI.

## 確認

保存状態テスト2件、app.jsとserver.mjsの構文、HTML内IDの重複なしを確認。透過画像を目視確認。更新後のブラウザ表示とクリック操作は、接続タイムアウトにより未検証。

## 2026-11-08更新：粗いドット絵と4画面

本人の追加指示によりリアルな素材を粗いオリジナルのレトロ育成ゲーム風へ変更。組み込みimage_genを使用。元のリアル版は assets/sekhmet-realistic.png、現在の素材は assets/sekhmet.png。既存起動プロセスでも画像が表示されるよう、ホームには現在のPNGをdata URIで埋め込んだ。画像を差し替える際はindex.htmlの埋め込みも更新する必要がある。

プロンプト：Transform this Sekhmet Egyptian cat into an ORIGINAL very coarse retro virtual-pet pixel sprite. Transparent background. Full seated body centered, front view, gold cat with dark blue striped Egyptian headdress, simplified golden sun disk crown and tiny ankh, curved tail. Retain recognizable character identity but completely replace realistic rendering with extremely chunky pixel art: apparent 32x32 pixel grid, each pixel a large perfectly square block, 10 flat colors maximum, dark brown 1-pixel outline, tiny face eyes, chubby compact silhouette. No realistic fur, no gradients, no soft shading, no antialiasing, no text, no background, no existing game character copy. Large clean square pixel clusters, intended to be scaled with nearest neighbor. Small transparent margin around complete figure.

ホームを状態カード中心に戻し、中央にセクメトを配置。CSS scroll-snapで4画面を移動。予定に日付を追加し、今日の一覧と月間カレンダーで同じデータを使う。CO₂は未接続のサンプル表示。

検証：Nodeテスト4件と構文確認成功。ブラウザで画像表示、カレンダーへの切り替え・月送り、ニュース分類、ホーム復帰を確認。タッチ実機のスワイプと日付付き予定追加のブラウザ保存は未検証。スクリーンショット：docs/home-pixel-preview.png。

## 2026-11-08：テレビ連携を保留

本人の指示によりテレビ接続を保留。エンタメ画面からFire TVの項目を外した。再開の指示があるまで接続作業は進めない。

## 2026-11-08：三列配置と下部5アイコン

本人指定に従い、左に場所・日付・時計・予定・天気・空気情報・日の出入り、中央にセクメト、右に室内値と機器状態。説明文と挨拶を削減し、家電操作は独立画面へ移動。下部にホーム・家電操作・エンタメ・ニュース・カレンダーのアイコンを配置し、aria-labelとtitleで名前を付与。横スワイプのscroll-snapは維持し、画面数と音楽取得対象のindexを更新。

場所は表示名だけ。AQI等の未取得値を推測せずダッシュで表示。実気象・空気情報・位置の自動取得は未接続。ブラウザでホーム配置と5タブの移動を確認。タッチ実機は未検証。確認画像：docs/home-compact-preview.png。

## 2026-11-08：レトロゲーム感と6種類の家電

DotGothic16をローカル同梱（SIL OFL、assets/fonts/OFL.txt）。日本語・数字を同じドット書体へそろえ、ピクセル風の影、角のある枠、淡いグリッドを採用。セクメト画像は変更していない。本人の希望によりモック値の説明を画面から除去し、固定値はREADMEに記載。

家電定義と保存値の検証はstate.jsのdeviceDefinitionsとrestoreStateに集約。6種類のオンオフと設定値を保存し、操作画面とホームの表示が同じ状態を参照する。旧データの照明は天井照明とフロアランプへ移行。

確認：ブラウザで6種類の表示、フロアランプ切替、エアコン24→25→24℃、再読み込み後の復元を確認。画像：docs/home-retro-preview.png。

フォントの出典：https://github.com/google/fonts/tree/main/ofl/dotgothic16 および https://github.com/fontworks-fonts/DotGothic16

## 2026-11-08：小型iPadと囲わないキャラクター

推奨案は「枠なし・足元の小さな影・上に浮かぶ吹き出し」。マスコットをカードの内容から独立させ、暮らしの情報の間にいる存在として表示。別案として足元に小さなドットの床や座布団を置く方法があるが、今回は囲わない方向を実装。

viewport 1133×744と744×1133で表示確認。大きな数字とキャラクター、下部タブを収める。最高最低をスラッシュ表記、日の出入りをアイコンへ変更。吹き出しは家電状態と当日の予定のテンプレートで約30秒ごとに11秒間表示。タップでも発話し、吹き出しが消えてもキャラクターの位置が動かないよう領域を確保。

スクリーンショット：docs/ipad-mini-landscape.pngとdocs/ipad-mini-portrait.png。小型iPad実機は未検証。

## 2026-11-08：天気と気温、予定3件

天気の横に「気温」と現在気温、下に最高最低のスラッシュ表示。AQI・PM2.5は縦並び。予定追加の＋は文字の字体依存を避けSVGとflexの中央配置へ変更。今日の予定に09:00洗濯、15:00買い出し、20:00読書をフォームから登録。自動シードは実装せず、このブラウザにのみ保存。1133×744で3件の表示と再読み込み後の復元を確認。確認画像：docs/home-weather-agenda.png。

## 2026-11-08：砂色・金・ラピスのパレット

セクメトの金色・青い頭巾がセージグリーンの画面から浮くとの本人の指摘に対応。背景を砂色、文字をブラウン、枠とアイコンを古金色へ統一。選択中タブと稼働中ステータスは彩度を抑えた青を少量使用し、キャラクターの青とつなぐ。ホーム以外の家電・ニュース・カレンダー・ダイアログも同じ色へ変更。

吹き出しはclip-pathによる段状の角、四角いピクセルの尾、硬い影でレトロRPGのメッセージ風に変更。画像・発話ロジック・保存データは変更していない。ブラウザで配色と発話時の吹き出しを確認。確認画像：docs/home-desert-preview.png。

## 2026-11-09：室内環境・家電・操作小窓

右側を「室内環境」「家電」に分けた。室内値は固定モックに対応する快適・良好表示。動的な閾値判定は未実装。家電はON/OFFバッジとアイコンの色で区別し、色だけに依存しない。掃除機の待機はOFFと同一視しない。

各家電はホームの行からdialogを開いて操作できる。操作カードのDOMノードを移動し、close時に元のプレースホルダーへ戻すことで、複製IDやイベントの再設定を避ける。閉じた時はホームの該当ボタンへフォーカスを戻す。

予定追加フォームもレトロな二重枠、タイトル帯、ドット書体、入力欄、ボタンへ統一。閉じる×はピクセル形SVGで場所設定・家電小窓と共通化。ブラウザでエアコン小窓、24→25→24℃、閉じた後のカード復帰、予定フォームと×を確認。テスト8件成功。確認画像：docs/home-status-sections.png、docs/task-retro-dialog.png。

## 2026-11-09：NES.css 2.3.0

本人指定でNES.css 2.3.0を導入。nes-container/is-rounded、nes-balloon/from-left、nes-btn、nes-dialog、nes-inputを実際のDOMに適用。CSSとMITライセンスをassets/vendor/nes-cssへ保存。公式配布CSSをstyles.cssへバンドルし、標準の黒枠を砂色・金色のパレットへ調整。以前の独自吹き出しの疑似要素を上書き解除し、NES.cssのピクセル枠と尾を使う。DotGothic16を維持。

既存テスト8件、構文、DOM ID重複なしを確認。Work設定でローカルブラウザ操作が無効のため、更新後の見た目・iPadサイズは未確認。サイトは本人限定のまま更新する。公式：https://github.com/nostalgic-css/NES.css

## 2026-11-09：DotGothic16の明示統一

同梱DotGothic16のCSS上の別名SekhmetPixelを正式な名前DotGothic16へ統一。NES.cssの標準フォントより優先し、本文・見出し・数値・ボタン・フォーム・小窓も同じフォントを明示。CSSのクエリを更新してiPadで旧CSSを再利用しないようにした。文字の疑似太字・斜体を生成しない。

## 2026-11-09：固定フレームと16×16アイコン

ヘッダー・本文・フッターをviewport全体のCSS Gridで分離。ヘッダーと下部ナビは本文スクロールに参加せず、中央だけがスクロールする。広い画面では左・中央・右を各領域内に収め、880px以下は左＋キャラクター、下に室内環境＋家電へ再配置。携帯では本文の縦スクロールを許し、固定タブとの重なりを避ける。旧画面幅別の大きなmargin-topや絶対位置に依存しないよう上書き。

Safariの動的ツールバーをvisualViewport.heightからCSS変数へ反映し、safe-area-insetを予約。ResizeObserverで画面幅変更時も現在のページへ揃える。

全画面表示は文字記号をやめ、16×16セルのSVGをボタン中央へ配置。ナビ・家電・位置・太陽・日の出入り・追加・閉じるアイコンもピクセル形状へ統一。定義：scripts/pixel-icons.mjs。テスト9件成功。全アイコンの座標が16×16内にあることを検証。

ブラウザ操作はWork設定で無効のままのため、更新後のiPad実機と画面の重なりは視覚確認できていない。

## 2026-11-09：レコード表示
- エンタメの表示を64×64セルのSVGレコードと固定トーンアームに変更。中央はジャケット、画像がない場合は金色ラベル。
- ディスクとジャケットを同じ要素で回転。Playingのみanimation-play-state:running、停止時はpausedで角度を保持。動きを減らす設定では回転なし。
- PC版はWindowsメディアのThumbnailを上限1MBのPNG/JPEGデータとして取得。公開版は未接続の停止表示。実曲・ジャケット取得とブラウザ描画は未検証。自動テスト10件成功。

## 2026-11-09：iPad向け4:3固定の試行
- 横長の指定を横4:縦3と解釈し、1024×768のキャンバスをvisualViewportに内接する倍率で均等に拡縮。余白は中央寄せ。レコード左上の金色ハイライトは通常の溝へ置換。
- サイズ別のCSS分岐は画面幅ではなくdashboardコンテナに基づくよう変更。スマホのviewport幅だけでiPad用キャンバス内部が縦配置になるのを防ぐ。
- JS構文・既存テスト11件成功。1024×768、1180×820、768×1024、390×700の内接計算を確認。ブラウザ操作が無効のため実画面は未確認。

## 2026-11-09：ホームの固定情報枠
- 日付時計・予定・天気にNES枠を追加。左116px/190px/残り、右224px/残りのGridに固定。中央キャラクターの枠は追加しない。
- 各枠はmin-height:0とoverflow:hidden、本文はflex:1/min-height:0/overflow-y:auto。見出しと追加ボタンは本文スクロールの外に配置。予定一覧や家電一覧の既存IDは維持。
- HTMLのタグ対応確認と既存テスト11件成功。ブラウザ表示・実機タッチ操作は未確認。

## 2026-11-09：縮小時のホーム枠線の修正
- 本人のSafariスクリーンショットで左右枠の辺が点線状に見えることを確認。ホーム5枠のborder-imageを解除し、3pxのsolid borderと内側の薄い線へ変更。枠装飾の疑似要素も解除。
- 固定配置・内部スクロールを維持。既存テスト11件成功。実機での改善は未確認。

## 2026-11-09：通知一覧と発話優先度
- 下部に6番目の通知タブを追加し、未読バッジ・個別確認・全件確認・内部スクロールを実装。ローカルの予定・機器状態を候補にし、変更のない同じ候補は再追加しない。履歴は最大200件、端末内localStorageに保存。
- 未読2件以上は「通知がN件あります。」、0〜1件は従来の発話。吹き出しとキャラクターから未読複数時に通知へ移動。確認後はホームに戻ると通常発話へ切替。
- 枠はNES.cssのrounded border-imageへ復帰し、stretchとoutset:0で統一。既存の固定配置と内部スクロールは維持。
- テスト14件成功：閾値0/1/2、既読保持、同一候補の重複抑止、値変更で新着、不正保存値。JS構文確認成功。実画面確認はブラウザ操作無効のため未実施。実サービスの通知取得は未接続。

## 2026-11-09：NES枠外の背景と室内環境
- NES画像枠の透明領域まで背景が塗られるのを避け、内側8pxの背景画像に変更。NES枠自体は維持。CSS宣言の連結時に欠けたセミコロンも修正。
- 室内環境はスクロール用classとtabindexを除き、3等分の行に固定。左はラベルと状態、右は数値と単位。既存テスト14件成功、実機表示は未確認。

## 2026-11-09：ローカルのみの配置再編
- 日の出・日の入りを削除。中央上に時計と日付、左に予定・天気・室内環境、右を家電だけにした。セクメト最大225×245px、吹き出し72pxへ縮小。
- エンタメは1つの枠の中でレコードと曲情報／操作を左右に分割。カレンダーは月表示:予定を1.65:1にし、全ページの表示領域を固定バーの間にそろえた。
- ブラウザでホーム・エンタメ・カレンダー・ニュースを確認。全6ページのclientHeight/scrollHeightは632/632、日の出入要素0、時計は中央、環境は左とDOMで確認。再生バーも本文領域内。既存テスト14件成功。
- ローカルのindex.html/styles.cssのみ変更、hosted-ipadは未更新。Sites操作・push・デプロイなし。画像：docs/local-layout-revised.png。新しい技術的学びはなく、Obsidianノートの追加は省略。

## 2026-11-09：枠幅の統一とカレンダーの拡大（ローカルのみ）
- ホーム枠を他ページと同じNES border-imageのoutset・背景に統一。外列を同じ1frにし、home-leftに残っていた224pxの内部列定義をminmax(0,1fr)に変更。
- ブラウザで左右枠幅289.17/289.18pxを確認（縮小表示時の丸め差）。カレンダーは2.4:1、年月30px、日付22pxへ変更し画面確認。CSSのみの変更につき既存機能テストは再実行していない。
- Sitesとhosted-ipadは未変更。画像docs/local-frames-unified.png。

## 2026-11-09：左右を小さい枠幅へ統一（ローカル）
- 本人の補足を受け左右を224 CSS pxへ固定。左は天気220px・予定140px・室内環境残りの順。AQI・PM2.5・花粉は1列3段に整列。
- ブラウザで左右枠の表示幅220.15pxが一致、天気詳細と室内環境のscrollHeight/clientHeightが一致することを確認。画像docs/local-compact-columns.png。Sites未変更。
- 既存の配置方式の調整で、新しい技術的学びの記録は不要。

## 2026-11-09：吹き出し名札と屋外環境（ローカル）
- セクメトの名前を下部から吹き出し左上に重なる名札へ移動。中央は時計・天気気温・吹き出し・キャラクターの4段に変更し、吹き出しとキャラクターを下げた。
- 左上は屋外環境に改名。AQI/PM2.5/花粉は室内環境と同様のラベル左・値右・3等分の行と区切り線へ統一。
- ブラウザで発話中の名札・枠重なりを確認。屋外3行のclientHeight/scrollHeight一致、キャラクター領域の下端が本文領域内であることを実測。Sites未変更。画像docs/local-nameplate-weather.png。既存のCSS配置変更で新しい技術的学びはなし。

## 2026-11-09：デスクトップの支給アイコンを採用（ローカル）
- 素材はC:/Users/kouro/Desktop/スマートディスプレイにあった。denkyu_on/off、weather_sunny、robotsojiki_white、shinbunshiをassets/iconsへ複製。元画像は編集せず、照明状態・晴れ・掃除機・ニュースへ使用。対応素材がないアイコンは維持。
- 照明はstateのonに応じて画像を切替え、一覧と操作カードを同時更新。小画像はデータURLで埋込み、画像の新ルートをサーバーに増やさず表示。表示サイズのみCSSで変更しimage-rendering:pixelatedを指定。
- ホームと家電画面で目視・画像読込成功を確認、構文確認と既存テスト14件成功。Sites未変更。新しい学びは既存の画像埋込み方式の再利用につきなし。

## 2026-11-09：pixel-iconの候補セット（未反映）
- 指定スキルで20×20のアイコン53種を作成。家電14種のみカラー、基本操作・天気・環境39種は単色。透明背景、整数の1×1矩形SVGとPNGを用意。
- docs/icon-proposals-v1/catalog-preview.pngに4倍・原寸・暗背景例、index.htmlに一覧、pixel-maps.jsonに正本を保存。scripts/create-icon-proposals.pyで再生成可能。
- 53種の縦横20以下、矩形の領域内、PNGのアルファ0/255を確認。プレビューを目視し矢印の方向と文字の収まりを訂正。
- アプリとSitesは未変更。ユーザー確認後に置換する。

## 2026-11-09：承認済みアイコンと吹き出し操作の反映（ローカル）
- pixel-icon候補53種をassets/pixel-icons-v1に保存し、画面で使用するアイコンを同じ20×20のSVGへ置換。DOMで旧pixel-iconや支給PNGが残っていないことを確認。家電のみカラー、その他は単色。
- ON/OFF・快適バッジを濃い茶色＋明るい砂色へ、OFFは灰系の明るい背景へ変更。ホームh2はRGB(73,60,41)に統一。名札・下部タブ・ニュースカテゴリの枠を同じNES border-imageへ変更。
- 通知吹き出しはクリックしても状態・画面を変更しない。予定の定型案内だけカレンダーに移動。予定に限りrole=button/tabindexを付けEnter/Spaceも対応。自動非表示時はrole=statusへ戻し、操作属性を除去。
- ブラウザで通知文「通知が4件あります。」をクリックし、scrollLeft=0・現在地ホーム・本文不変を確認。予定遷移は単体テスト確認、実際の予定文によるUI往復は未実施。状態変更はユーザーの操作を維持し、既読や機器値をテストで変更していない。
- node --test 15件成功。新アイコンの20×20座標と家電以外の単色、予定以外に遷移先なしを検証。画像docs/local-approved-icons.png。Sites・hosted-ipad未変更。

## 2026-11-09：端末のアスペクト比へ自動追従（ローカル）
- 固定1024×768を中央配置する方式から、visualViewportの幅・高さそれぞれを使う可変キャンバスへ変更。小画面の倍率はmin(1,width/1024,height/768)、論理幅=width/scale・論理高=height/scaleとして余白帯をなくす。iPad Airの型番判定はしない。
- 左右の224px枠は維持し、余った幅は中央へ。高さは本文Gridへ配分。Safariのバーの出入りと向き変更時に再計算。safe-areaもヘッダー・フッターで処理。
- ブラウザで1180×820→キャンバス1180×820、1024×768→1024×768、1180×740→約1180×740、820×1180→約820×1180を確認。1180×820で全6ページの本文clientHeight/scrollHeight684/684。iPad Safari実機は未検証。テスト15件成功。Sites未変更。

## 2026-11-10：更新スキルに合わせて16×16へ描き直し
- pixel-iconの上限が16×16へ更新されたため、53種を整数座標で新規に描画。旧20×20を縮小する処理は使わない。家電だけカラー、その他は単色を維持。
- 正本scripts/create-icons-v2.py、docs/icon-proposals-v2/pixel-maps.json。SVG/PNGはassets/pixel-icons-v2。一覧はdocs/icon-proposals-v2/catalog-preview.png。v1は履歴として保持。
- アプリの静的24アイコンと動的家電をv2へ置換。DOM上37アイコンすべてviewBox 0 0 16 16、旧v1ゼロを確認。ホーム/家電操作を目視確認、元PNG53点の16×16とアルファ0/255、既存テスト15件成功。
- 機器状態は変更せず、Sites・hosted-ipad未変更。画像docs/local-icons-v2.png。

## 2026-11-10：添付画像に合わせた塗りのあるアイコンv3
- ユーザーの一覧画像を参考に53種類をv3へ。単なる線画から、塗り・輪郭・不透明な段階色を持つ16×16へ変更。家電のみ色付き、それ以外はグレースケールを維持。デバイスタブは重なる画面、カレンダーは綴じ具と日付、通知はベル。曖昧な参考図は16ドットで識別できる形へ補完。
- ロボット掃除機を丸い本体・段階状のリング・中央センサーで再構成。ON/OFFの差はセンサーの色。空気清浄機の稼働、加湿器の蒸気、エアコンの風なども状態に合わせた。
- scripts/create-icons-v3.py、assets/pixel-icons-v3、docs/icon-proposals-v3に正本・SVG/PNG・一覧を保存。前の版は履歴として保持。
- 静的24個＋動的家電を置換。DOM上37アイコンがv3、旧v1/v2ゼロ、すべて16×16。ホームと家電画面を目視、PNG53点の寸法・アルファ0/255確認、テスト15件成功。Sites未変更。画像docs/local-icons-v3.png。
- 既存の整数ピクセル生成・検証方式の応用であり、新規の技術的学びはなし。
