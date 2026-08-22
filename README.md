# MockMaker

## 概要

MockMaker は、iPhoneアプリのスクリーンショットや短い動画を使って、App Store掲載用・SNS投稿用のモックアップを作るiOSアプリです。

UIはExpo/React Native、画像描画はSkia、動画書き出しはiOSのローカルExpo moduleで実装しています。

## 機能

- iPhone 1台、2台並び、上部クロップ、スプリット、アイコン、自由配置テンプレート
- 画像、動画、テキスト、ステッカーのレイヤー編集
- 背景プリセット、単色/グラデーション/画像背景
- フレームのサイズ・位置調整
- PNG/JPG画像として保存・共有
- `single` / `double` テンプレートでのiOS動画書き出し
- RevenueCatを使ったPro買い切り状態の管理
- Proユーザー向けの端末内プロジェクト保存

## 技術スタック

- Expo SDK 54
- React Native 0.81
- Expo Router
- TypeScript strict mode
- Zustand
- @shopify/react-native-skia
- expo-video
- Expo Modules API
- AVFoundation / CoreImage
- RevenueCat
- react-native-google-mobile-ads
- NativeWind / Tailwind CSS
- EAS Build / Submit

## 設計・実装

画像書き出しはSkia canvasのsnapshotをPNG/JPGにエンコードしています。

動画はReact Nativeのviewをそのまま録画するのではなく、プレビューとexportで同じscene情報を使う構成にしています。`src/utils/mediaScene.ts` でmediaの表示領域、実際の描画領域、crop情報を作り、iOS側の `modules/video-compositor` に渡してMP4を書き出します。

動画exportは `single` と `double` を対象にしています。`split`, `top-half`, `free` は画像書き出し向けのテンプレートとして扱っています。

## セットアップ

```bash
npm ci
cp .env.example .env
npm run typecheck
```

RevenueCatを有効にして動かす場合は、`.env` に以下を設定します。

```env
EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY=
EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY=
EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=pro
```

```bash
npm run ios:dev-client
```

Dev Clientが入っている端末ではMetroだけ起動します。

```bash
npm run start:dev-client
```

Expo Goは対象外です。

CIは `npm ci`, `npx tsc --noEmit`, `npm run build` を実行します。`npm run build` はiOS向けJS bundleの生成確認です。

## その他

EASのprofileは `eas.json` に定義しています。

```bash
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

- 動画exportの確認観点: `docs/testing/video-export-rebuild-gate.md`
- Pro / RevenueCat設定: `docs/ios-pro-plan-setup.md`
