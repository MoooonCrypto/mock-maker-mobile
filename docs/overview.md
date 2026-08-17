# MockMaker Mobile Overview

最終更新: 2026-08-17

MockMaker Mobile は、iPhoneフレームを使ったアプリ紹介用モックアップをiOS上で作成するExpo/React Nativeアプリです。スクリーンショットや短い動画をテンプレートに配置し、背景・テキスト・ステッカーを調整して、画像または動画として書き出します。

このドキュメントは開発者向けの現状整理です。採用・閲覧向けの概要はルートの [README.md](../README.md) を参照してください。

## 現在の主な機能

- `single`, `double`, `top-half`, `split`, `icon`, `free` テンプレート
- 画像・動画・テキスト・ステッカーレイヤー
- iPhoneフレームのサイズ調整、位置調整、左右2台配置
- 背景プリセット、単色/グラデーション/画像背景
- 画像のPNG/JPG書き出し、写真ライブラリ保存、共有
- `single` / `double` テンプレート向けのiOS動画書き出し
- RevenueCatによるPro買い切り状態の管理
- Pro向けの端末内プロジェクト保存

## 技術スタック

| 領域 | 採用技術 |
| --- | --- |
| App framework | Expo SDK 54, React Native 0.81 |
| Navigation | Expo Router |
| Rendering | @shopify/react-native-skia |
| Video preview | expo-video |
| Video export | local Expo module, AVFoundation/CoreImage |
| State | Zustand |
| Storage | AsyncStorage, expo-file-system |
| In-app purchase | RevenueCat |
| Ads | react-native-google-mobile-ads |
| Styling | NativeWind, Tailwind CSS |
| Language | TypeScript strict mode |

## 実装メモ

### 画像書き出し

画像書き出しはSkia canvasのsnapshotを使います。`src/services/compositing.ts` がPNG/JPGへのエンコードとキャッシュファイル作成を担当し、`src/app/export/[id].tsx` から写真ライブラリ保存や共有に接続しています。

### 動画プレビューと書き出し

動画プレビューはReact Native上の `VideoOverlay`、動画書き出しは `modules/video-compositor` のiOSネイティブモジュールで行います。

座標の真実は `src/utils/mediaScene.ts` の `buildMediaScene()` に寄せています。プレビューとexportで同じ `targetRect`, `drawRect`, crop情報を使うことで、見た目のズレを減らす設計です。

現在、動画書き出しの対象は `single` と `double` に限定しています。`split`, `top-half`, `free` では動画選択/動画書き出しを完成機能として扱っていません。

### Pro機能

RevenueCatの公開SDKキーはExpo public envから読み込みます。Pro entitlementのデフォルトIDは `pro` です。

関連ファイル:

- `app.config.js`
- `src/config/purchases.ts`
- `src/stores/usePurchaseStore.ts`
- `src/stores/useProjectStore.ts`

## 開発時の確認

```bash
npm ci
npm run typecheck
npm run start:dev-client
```

ネイティブモジュールとSkiaを使うため、Expo GoではなくDevelopment Buildで確認します。

```bash
npm run ios:dev-client
```

## EAS

`eas.json` には以下のprofileがあります。

- `development`: 実機Development Build
- `development-simulator`: iOS Simulator向けDevelopment Build
- `preview`: store distributionの確認用
- `production`: 本番提出用

提出は `submit.production` を使う構成です。

## テスト観点

現在の重点確認は動画exportです。詳細は [testing/video-export-rebuild-gate.md](testing/video-export-rebuild-gate.md) を参照してください。
