# MockMaker

## 概要

MockMaker Mobile は、iPhoneアプリのスクリーンショットや短い動画を使って、App Store掲載用・SNS投稿用のモックアップを作るiOSアプリです。

Expo/React Nativeで作っていますが、見た目の核になるキャンバス描画と動画書き出しはかなりネイティブ寄りです。画像はSkiaで描画し、動画はiOSのローカルExpo moduleで合成しています。

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

Development Buildで起動します。

```bash
npm run ios:dev-client
```

すでにDev Clientが端末に入っている場合は、Metroだけ起動できます。

```bash
npm run start:dev-client
```

Expo Goでは確認できません。Skia、RevenueCat、Google Mobile Ads、ローカルExpo moduleを使っているため、Development Buildが必要です。

環境変数は `.env.example` をもとに設定します。

```env
EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY=
EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY=
EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=pro
```

RevenueCatのキーは公開SDKキーを使います。secret keyは入れません。

利用する主なscriptは以下です。

```bash
npm run start
npm run start:dev-client
npm run ios
npm run ios:dev-client
npm run android
npm run web
npm run build
npm run typecheck
```

CIでは `npm ci`, `npx tsc --noEmit`, `npm run build` を実行します。`npm run build` は `expo export --platform ios` によるiOS向けJavaScript bundle生成の確認です。

## その他

`eas.json` には `development`, `development-simulator`, `preview`, `production` のbuild profileがあります。App Store Connectへの提出は `production` submit profileを使います。

```bash
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

- `ios/` と `android/` はExpo prebuild由来の生成フォルダとしてGit管理外にしています。
- 動画exportの重点確認項目は `docs/testing/video-export-rebuild-gate.md` にまとめています。
- Pro機能の設定手順は `docs/ios-pro-plan-setup.md` にあります。
