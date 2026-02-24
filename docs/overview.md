# MockMaker Mobile

iPhone / iPad / Mac / Windows のデバイスフレーム上に画像・動画を配置し、おしゃれな背景付きモックアップを作成・書き出しできる iOS アプリ。

---

## 技術スタック

| カテゴリ | 技術 | バージョン |
|---------|------|-----------|
| フレームワーク | Expo SDK | 54 |
| UI | React Native | 0.81 |
| ルーティング | Expo Router | v4（ファイルベース） |
| スタイリング | NativeWind + Tailwind CSS | v4 / 3.3 |
| 状態管理 | Zustand | v5 |
| キャンバス描画 | @shopify/react-native-skia | v2 |
| ジェスチャー | react-native-gesture-handler | v2 |
| アニメーション | react-native-reanimated | v4 |
| 動画表示 | expo-video | v3 |
| 動画合成 | ffmpeg-kit-react-native | 6.0.2 |
| アーキテクチャ | Old Architecture（Paper） | `newArchEnabled: false` |

> ffmpeg-kit-react-native は New Architecture 非対応のため Old Architecture を使用

---

## 画面構成

### Stack 画面
- **スタート画面** (`src/app/index.tsx`) — 新規作成ボタン＋テンプレートグリッド（8種類）
- **設定** (`src/app/settings.tsx`) — デフォルト書き出し設定（モーダル）

### モーダル / スタック画面
- **エディター** (`src/app/editor/[id].tsx`) — メインの編集画面
- **フレーム選択** (`src/app/editor/frame-select.tsx`) — デバイスフレーム選択（iPhone/iPad/Mac/Windows）
- **書き出し** (`src/app/export/[id].tsx`) — PNG/JPG 書き出し、MP4 動画書き出し、カメラロール保存、シェア

---

## ディレクトリ構成

```
src/
├── app/                        # Expo Router ルート
│   ├── _layout.tsx             # ルートレイアウト（Stack のみ、タブなし）
│   ├── index.tsx               # スタート画面（新規作成 + テンプレート）
│   ├── settings.tsx            # 設定画面（モーダル）
│   ├── editor/
│   │   ├── [id].tsx            # エディター
│   │   └── frame-select.tsx    # フレーム選択
│   └── export/
│       └── [id].tsx            # 書き出し
├── components/
│   └── editor/
│       ├── Canvas.tsx          # Skia キャンバス（背景・レイヤー・フレーム描画）
│       ├── GestureCanvas.tsx   # パン・ピンチ・タップジェスチャー制御
│       ├── VideoOverlay.tsx    # expo-video ビデオオーバーレイ（Skia 上に重ねる）
│       ├── Toolbar.tsx         # ツールバー
│       ├── BackgroundPicker.tsx # 背景選択パネル
│       ├── ScreenshotEditor.tsx # 角丸・影・枠線スライダー
│       └── LayerPanel.tsx      # レイヤー一覧・選択・削除
├── stores/
│   ├── useEditorStore.ts       # エディター状態・Canvas ref・セッション名
│   └── useSettingsStore.ts     # 設定（AsyncStorage で永続化）
├── services/
│   ├── compositing.ts          # Skia スナップショット → ファイル保存
│   ├── videoCompositing.ts     # ffmpeg 動画合成（フレーム背景 + 動画 → MP4）
│   └── storage.ts              # ファイル保存ユーティリティ
├── constants/
│   ├── theme.ts                # デザイントークン（色・間隔・角丸）
│   ├── devices.ts              # デバイスフレームデータ（14 デバイス）
│   └── backgrounds.ts          # プリセット背景（12 種類）
├── types/
│   └── index.ts                # TypeScript 型定義
└── utils/
    └── media.ts                # メディアピッカーユーティリティ
```

---

## 主要機能

### エディター
- **Skia キャンバス**: 背景（グラデーション / 単色）、デバイスフレーム、画像レイヤーをリアルタイム描画
- **デバイスフレーム**: Skia で直接描画（ベゼル、Dynamic Island、シャドウ）。画像アセット不要
- **ジェスチャー**: パン（移動）、ピンチ（拡大縮小）、タップ（レイヤー選択）
- **レイヤー**: 画像・動画・テキストの 3 種類。追加・選択・削除対応
- **動画オーバーレイ**: expo-video の `VideoView` を Skia キャンバス上に絶対座標で重ねて表示

### スタイル調整
- 角丸スライダー (0–50px)
- 影の深さスライダー + ON/OFF トグル
- 枠線の太さスライダー + カラープリセット 6 色

### 書き出し（画像）
- Skia `makeImageSnapshotAsync()` でキャンバスをキャプチャ
- PNG / JPG フォーマット選択
- 標準 / 高画質 選択
- カメラロールへの保存（`expo-media-library`）
- シェア機能（`expo-sharing`）

### 書き出し（動画）
- 動画レイヤーがある場合に「動画をライブラリに保存（MP4）」ボタンが表示される
- Skia スナップショット（フレーム背景 + 背景のみ）を PNG として保存
- ffmpeg-kit-react-native で動画を screen rect に合成
- `[1:v]scale=W:H[vid];[0:v][vid]overlay=X:Y:shortest=1[out]` フィルター使用
- MP4（H.264）でカメラロールに保存

### テンプレート
- スタート画面にデバイス＋背景の組み合わせプリセット 8 種類を表示
- 選択するとエディターへ遷移（deviceFrame + background が設定済み）

---

## データモデル

プロジェクトデータはメモリ上のみで管理（永続化しない）。設定のみ AsyncStorage で永続化。

主な型:
- `Layer` — レイヤー（画像/動画/テキスト、位置、サイズ、角丸、影、枠線）
- `DeviceFrame` — デバイス情報（カテゴリ、画面サイズ）
- `Background` — 背景（単色/グラデーション/画像）
- `ExportSettings` — 書き出し設定（フォーマット、画質、スケール）

---

## デザインリファレンス

Stitch MCP プロジェクト `projects/12788505799698113063`（5 画面）をリファレンスとして使用。

- カラー: Primary `#2b8cee`、背景 `#f6f7f8`
- フォント: Inter
- 角丸: 12px 基準

---

## 起動方法（Dev Client）

`@shopify/react-native-skia` は Expo Go 未対応のため、**Dev Client でのビルドが必要**。

```bash
# iOS シミュレータでビルドして起動
npx expo run:ios

# 実機の場合（Dev Client アプリインストール後）
npx expo start --dev-client
```

### 初回ビルドの注意
- `npx expo run:ios` は Xcode を使って iOS 向けにネイティブビルドを行う
- ビルドには数分かかる
- 2 回目以降は `npx expo start --dev-client` でバンドルのみ再起動できる

---

## 今後の課題

- **ffmpeg-kit ビルド確認**: `newArchEnabled: false` でのビルドで ffmpeg-kit が正常リンクされるか要確認
- **デバイスフレーム画像アセット**: 現在は Skia で描画。実物に近いフレーム画像があればより高品質に
- **ダークモード UI**: デザイントークンは定義済み、UI 側の切り替え実装が必要
- **クラウド同期**: Stitch デザインにはクラウドタブがあるが未実装
