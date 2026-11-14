"""Export a dated, self-contained local design asset library without changing the app."""
from pathlib import Path
from html.parser import HTMLParser
from html import escape
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'design-assets'
OUT.mkdir(exist_ok=True)

def copy(source, target):
    source, target = ROOT / source, OUT / target
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)

for source, target in [
    ('assets/pixel-icons-v3', 'icons/current-v3'),
    ('assets/pixel-icons-v2', 'archive/icons-v2'),
    ('assets/pixel-icons-v1', 'archive/icons-v1'),
    ('assets/icons', 'archive/supplied-icons'),
    ('assets/fonts', 'fonts'),
    ('assets/vendor', 'vendor'),
]:
    for file in (ROOT / source).rglob('*'):
        if file.is_file():
            copy(file.relative_to(ROOT), Path(target) / file.relative_to(ROOT / source))

for name in ['sekhmet.png', 'sekhmet-realistic.png']:
    copy('assets/' + name, 'characters/' + name)
copy('docs/icon-proposals-v3/catalog-preview.png', 'previews/icon-catalog.png')
copy('docs/icon-proposals-v3/pixel-maps.json', 'sources/pixel-maps-v3.json')
for name in ['create-icons-v3.py', 'create-icons-v2.py', 'create-icon-proposals.py']:
    copy('scripts/' + name, 'sources/scripts/' + name)
# Keep the original project-relative dependencies used by the icon generator.
copy('docs/icon-proposals-v1/pixel-maps.json', 'sources/docs/icon-proposals-v1/pixel-maps.json')
for name in ['index.html', 'styles.css', 'app.js', 'state.js', 'notifications.js',
             'media.js', 'server.mjs', 'package.json']:
    if (ROOT / name).exists():
        copy(name, 'sources/dashboard/' + name)

html = (ROOT / 'index.html').read_text('utf-8')

class Parts(HTMLParser):
    """Preserve exact source markup including SVG instead of serializing a DOM."""
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.stack, self.parts = [], []
        self.offsets = [0]
        for line in html.splitlines(keepends=True):
            self.offsets.append(self.offsets[-1] + len(line))

    def pos(self):
        line, column = self.getpos()
        return self.offsets[line - 1] + column

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        entry = (tag, attrs.get('id'), self.pos())
        if tag in {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
                   'link', 'meta', 'param', 'source', 'track', 'wbr'}:
            if entry[1]:
                self.parts.append((entry[1], tag, html[entry[2]:entry[2]+len(self.get_starttag_text())]))
        else:
            self.stack.append(entry)

    def handle_endtag(self, tag):
        for index in range(len(self.stack)-1, -1, -1):
            if self.stack[index][0] == tag:
                _, key, start = self.stack[index]
                if key:
                    end = html.index('>', self.pos()) + 1
                    self.parts.append((key, tag, html[start:end]))
                del self.stack[index:]
                break

parser = Parts()
parser.feed(html)
parts = []
for key, tag, markup in parser.parts:
    path = OUT / 'parts' / (key + '.html')
    path.parent.mkdir(exist_ok=True)
    path.write_text(markup, 'utf-8')
    parts.append({'id': key, 'tag': tag, 'file': str(path.relative_to(OUT)).replace('\\', '/')})
(OUT / 'parts' / 'index.json').write_text(json.dumps(parts, ensure_ascii=False, indent=2), 'utf-8')

icons = json.loads((OUT / 'sources/pixel-maps-v3.json').read_text('utf-8'))
cards = []
for item in icons:
    key, label = item['id'], item['label']
    base = f'icons/current-v3/{key}-16x16'
    cards.append(f'<article><img src="{base}.png" alt="{escape(label)}" width="64" height="64">'
                 f'<p>{escape(label)}</p><code>{key}</code><p><a href="{base}.svg">SVG</a> / '
                 f'<a href="{base}.png">PNG</a></p></article>')
part_links = ''.join(f'<li><a href="{p["file"]}">{escape(p["id"])}</a> ({p["tag"]})</li>' for p in parts)
(OUT / 'index.html').write_text('''<!doctype html><html lang="ja"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>セクメト 素材一覧</title>
<style>@font-face{font-family:Dot;src:url(fonts/DotGothic16-Regular.ttf)}
body{font-family:Dot,sans-serif;background:#e6d9bb;color:#493c29;margin:32px;line-height:1.6}
a{color:#493c29}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px}
article{background:#fbf4e3;border:3px solid #9c7e4b;padding:16px;text-align:center}
img{image-rendering:pixelated;object-fit:contain}code{font-size:12px}ul{columns:3}h1{font-size:28px}</style>
<h1>セクメト 素材ライブラリー</h1><p>2026-11-10 保存版。現行アイコン53種／家電のみカラー。</p>
<p><a href="README.md">構成・使い方</a> ／ <a href="previews/icon-catalog.png">一覧画像</a></p>
<h2>キャラクター</h2><img src="characters/sekhmet.png" width="160" height="200" alt="セクメト">
<h2>現行アイコン</h2><section>''' + ''.join(cards) + '''</section>
<h2>UIパーツのHTMLソース</h2><p>吹き出し・時計・室内環境・予定・家電・レコード・カレンダー・通知・ダイアログ等。
各断片は単独で完成画面にはなりません。対応CSS・JavaScriptはsources/dashboardに保存しています。</p><ul>'''
    + part_links + '</ul></html>', 'utf-8')

(OUT / 'README.md').write_text(f'''# セクメト 素材ライブラリー

保存日：2026-11-10。現行ローカル実装の素材保存版です。アプリ本体は変更していません。
`index.html`をブラウザーで開くと、アイコンとパーツ索引を確認できます。

- `icons/current-v3/`：現行53種類。透明背景16×16のSVG・PNG。家電のみカラー。整数倍率で拡大してください。
- `characters/`：現在のピクセル版セクメトと元のリアル版。
- `parts/`：index.htmlのID付きUIパーツ{len(parts)}点を元のマークアップで保存。吹き出し・名前枠・時計・天気・屋外環境・室内環境・予定・家電枠・レコード・操作バー・ニュース・カレンダー・通知・各ポップアップ等。`index.json`が索引です。
- `sources/dashboard/`：現在のHTML・全CSS・JavaScript・ローカルサーバーのコピー。動的に作る家電カード、予定行、通知行、カレンダー日付はapp.js等の生成コードに含まれます。
- `sources/`：アイコンのピクセルマップ、生成スクリプトと依存メタデータ。再生成する場合は元プロジェクトルートで既存スクリプトを実行するか、同じ相対ディレクトリ構造を復元してください。PythonとPillowが必要です。
- `fonts/`：DotGothic16とOFLライセンス。
- `vendor/`：NES.cssとMITライセンス。
- `archive/`：旧v1・v2の全アイコン、以前の支給素材。現行との混同を避けて分離。
- `previews/`：現行アイコンの一覧。
- `manifest.json`：保存ファイルのSHA-256、サイズ、元データ確認用の一覧。

## パーツを再利用するとき

HTML断片には親要素の.dashboard-shell等を前提にするものがあります。見た目の再現にはsources/dashboard/styles.cssも参照してください。枠や吹き出し、レコードと針はHTML/CSS製であり、独立したPNG素材ではありません。動作には対応JavaScriptとDOMが必要です。sources/dashboardはコード参照用の保存版で、これだけを単独起動する配布アプリではありません。

ライブ取得するジャケット写真は保存対象に含みません。個人の予定・ブラウザー保存状態・認証情報・サーバーログも含みません。第三者素材の権利は各権利者に帰属します。外部公開前には素材ごとの利用条件を確認してください。
''', 'utf-8')
files = []
for file in sorted(OUT.rglob('*')):
    if file.is_file() and file.name != 'manifest.json':
        data = file.read_bytes()
        files.append({'path': file.relative_to(OUT).as_posix(), 'bytes': len(data),
                      'sha256': hashlib.sha256(data).hexdigest()})
(OUT / 'manifest.json').write_text(json.dumps({'date': '2026-11-10', 'icons': len(icons),
    'parts': len(parts), 'files': files}, ensure_ascii=False, indent=2), 'utf-8')
assert len(list((OUT / 'icons/current-v3').glob('*.svg'))) == 53
assert len(list((OUT / 'icons/current-v3').glob('*.png'))) == 53
for item in files:
    assert hashlib.sha256((OUT / item['path']).read_bytes()).hexdigest() == item['sha256']
print(f'Exported {len(icons)} current icons, {len(parts)} HTML parts, {len(files)} files to {OUT}')
