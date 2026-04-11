# iOS Proプラン導入手順

最終更新: 2026-04-05

このドキュメントは、このリポジトリに実装済みの以下の機能を、**iOSのみ** で有効化するための具体手順です。

- 無料ユーザ: 広告あり、プロジェクト保存なし
- Pro買い切りユーザ: 広告非表示、プロジェクト保存あり
- 価格: 500円

Android は対象外です。この手順では Google Play Console については扱いません。

## 0. 先に理解しておくこと

このコードでは、以下の値を使います。

- RevenueCat entitlement ID: `pro`
- 環境変数:
  - `EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY`
  - `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID`

参照箇所:

- [app.config.js](../app.config.js)
- [src/config/purchases.ts](../src/config/purchases.ts)
- [src/stores/usePurchaseStore.ts](../src/stores/usePurchaseStore.ts)

## 1. RevenueCat で Pro entitlement を作る

### 1-1. RevenueCat にログイン

1. RevenueCat にログインする。
2. まだ Project が無ければ新規作成する。
3. Project 名は `MockMaker` など分かりやすい名前にする。

### 1-2. iOS App を追加

1. Project を開く。
2. 左メニューで `Project Settings` を開く。
3. `Apps` で `+ New` を押す。
4. Store は `App Store` を選ぶ。
5. App 名は `MockMaker iOS` などにする。
6. Bundle ID はこのアプリのものを入れる。

このリポジトリの現状の bundle identifier:

- `com.mockmaker.mobile`

確認箇所:

- [app.json](../app.json)

### 1-3. Entitlement を作る

1. 左メニューで `Entitlements` を開く。
2. `+ New` を押す。
3. Identifier に `pro` を入力する。
4. Display Name は `Pro` でよい。
5. 保存する。

重要:

- コード側のデフォルト entitlement ID は `pro` です。
- 別名にしたい場合は、後で `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` も合わせて変更します。

## 2. App Store Connect で買い切り IAP を作る

### 2-1. 事前条件を満たす

App Store Connect で以下が未完了だと、有料 IAP を有効化できません。

1. `Paid Applications Agreement` に同意する。
2. 銀行口座情報を登録する。
3. 税務情報を登録する。

確認場所:

1. App Store Connect にログインする。
2. トップの `Business` を開く。
3. `Agreements` を開く。
4. `Paid Applications` が `Active` になっていることを確認する。

未完了なら、その場で `Action Required` の項目を埋める。

### 2-2. アプリを開く

1. App Store Connect の `Apps` を開く。
2. `MockMaker` を選ぶ。
3. 左メニューの `In-App Purchases` を開く。

### 2-3. 買い切り商品を作る

1. `+` を押す。
2. Type は `Non-Consumable` を選ぶ。
3. Product ID を決める。

推奨:

- `mockmaker_pro_lifetime`

4. Reference Name は `MockMaker Pro` にする。
5. 作成する。

### 2-4. 価格を設定する

1. 作成した IAP を開く。
2. `Price Schedule` を設定する。
3. 日本の価格が **500円相当** になる tier を選ぶ。

注意:

- Apple は「500円を手入力」ではなく price tier です。
- 日本価格表示が 500円になる tier を選んでください。
- 実際の tier 番号は App Store Connect 上で確認してください。

### 2-5. 表示情報を埋める

最低限、以下を埋める。

1. Display Name
   - `MockMaker Pro`
2. Description
   - `広告を非表示にし、この端末にプロジェクトを保存できます。`
3. Review Screenshot
   - 設定画面や保存機能が分かるスクリーンショットを 1 枚アップロードする

### 2-6. 保存して審査可能状態にする

1. 必須項目が埋まったら保存する。
2. Status が `Ready to Submit` 相当になることを確認する。

## 3. RevenueCat で IAP と entitlement を結びつける

### 3-1. App Store product を取り込む

1. RevenueCat の Project を開く。
2. 左メニューで `Products` を開く。
3. `+ New` または `Import Products` を押す。
4. Store は `App Store` を選ぶ。
5. さきほど作った product ID `mockmaker_pro_lifetime` を選ぶ。
6. 取り込む。

### 3-2. Product を entitlement `pro` に紐づける

1. `Entitlements` を開く。
2. `pro` を開く。
3. `Attach Products` で `mockmaker_pro_lifetime` を追加する。
4. 保存する。

### 3-3. Offering を作る

1. `Offerings` を開く。
2. `+ New` を押す。
3. Identifier は `default` でよい。
4. Display Name は `Default Offering` などでよい。
5. 作成する。

### 3-4. Lifetime package を追加する

1. 作成した offering を開く。
2. `Add package` を押す。
3. Package type は `Lifetime` を選ぶ。
4. Product は `mockmaker_pro_lifetime` を選ぶ。
5. 保存する。

### 3-5. Current Offering にする

1. Offerings 一覧に戻る。
2. 今作った offering を `Current` または `Default` に設定する。

このコードは `current offering` の `lifetime` を優先して購入します。

参照:

- [src/stores/usePurchaseStore.ts](../src/stores/usePurchaseStore.ts)

## 4. ローカル環境と EAS に RevenueCat のキーを入れる

### 4-1. RevenueCat の Apple API Key を控える

1. RevenueCat の `Project Settings` を開く。
2. `API Keys` を開く。
3. Apple app 用の **Public SDK Key** をコピーする。

注意:

- 使うのは Secret Key ではなく **Public SDK Key** です。

### 4-2. ローカルの `.env` を作る

リポジトリルートで `.env` を作り、以下を入れる。

```env
EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY=appl_xxxxxxxxxxxxx
EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=pro
```

テンプレート:

- [../.env.example](../.env.example)

### 4-3. EAS 環境変数にも登録する

ターミナルで Expo にログインしてから、以下を実行する。

```bash
eas login
eas env:create --scope project --environment development --name EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY --value appl_xxxxxxxxxxxxx
eas env:create --scope project --environment development --name EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID --value pro
eas env:create --scope project --environment preview --name EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY --value appl_xxxxxxxxxxxxx
eas env:create --scope project --environment preview --name EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID --value pro
eas env:create --scope project --environment production --name EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY --value appl_xxxxxxxxxxxxx
eas env:create --scope project --environment production --name EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID --value pro
```

補足:

- `development` は実機検証用
- `preview` は TestFlight に近い確認用
- `production` は本番提出用

### 4-4. キーが反映されるコード位置

- [app.config.js](../app.config.js)
- [src/config/purchases.ts](../src/config/purchases.ts)

## 5. iPhone 実機で動かすためのビルドを作る

### 5-1. 依存関係を入れる

すでにこのブランチでは `react-native-purchases` を追加済みです。念のため最新状態にする場合:

```bash
npm install
```

### 5-2. iOS 開発ビルドを作る

このリポジトリの `eas.json` には `development` プロファイルがあるので、それを使う。

確認箇所:

- [../eas.json](../eas.json)

クラウドビルド:

```bash
eas build --platform ios --profile development
```

ローカルで Xcode ビルドする場合:

```bash
npx expo run:ios --device
```

注意:

- 実課金確認は **Expo Go では不可**
- **iPhone 実機** で確認する
- Apple Developer の Signing が通る必要がある

### 5-3. 実機にインストールする

1. `eas build` 完了後、表示された install URL を iPhone で開く。
2. アプリをインストールする。
3. iPhone で `設定 > プライバシーとセキュリティ > デベロッパモード` を有効にする必要があれば有効化する。

### 5-4. Metro を立ち上げる

開発ビルドで JS を流す場合:

```bash
npm run start:dev-client
```

## 6. Sandbox テスターを作って購入確認する

### 6-1. Sandbox Apple Account を作る

1. App Store Connect を開く。
2. `Users and Access` を開く。
3. `Sandbox` または `Sandbox Testers` を開く。
4. `+` を押す。
5. テスト用メールアドレスで新規作成する。

例:

- `mockmaker.sandbox.001@example.com`

### 6-2. iPhone の App Store から通常アカウントは維持する

最近の iOS では、Sandbox 購入は購入ダイアログ時にテスター認証へ進むことがあります。端末全体の App Store アカウントを普段使いから切り替えなくてもよい場合があります。

ただし端末状況で挙動が違うので、うまく出ない場合は以下も確認する。

1. iPhone の `設定` を開く。
2. `Developer` または `App Store` 配下に `Sandbox Account` 項目があれば、そこでテスターを設定する。

### 6-3. 購入の確認手順

1. 実機でアプリを起動する。
2. ホームまたは設定画面から `Proを購入` を押す。
3. Sandbox 購入ダイアログが出ることを確認する。
4. テスターで購入する。
5. 購入後、設定画面で `Proが有効です` が出ることを確認する。

確認ポイント:

- 設定画面で購入後に Pro 表示へ変わる
- editor で保存アイコンがロック表示ではなく保存アイコンになる
- プロジェクト保存が成功する
- 保存済みプロジェクト一覧が開ける
- 書き出し後に広告が出ない

### 6-4. 復元の確認手順

1. アプリを削除するか、クリーンビルドした別端末で起動する。
2. 設定画面を開く。
3. `購入を復元` を押す。
4. Pro 表示へ戻ることを確認する。

重要:

- **復元されるのは購入状態だけ**
- **保存済みプロジェクトは端末ローカル保存なので復元されない**

## 7. 提出前チェック

App Review で詰まりやすい点だけ、最後に確認する。

1. App Store Connect の IAP に説明文とレビュー用スクリーンショットがある
2. アプリ内の表記が実装と一致している
3. 「買い切り」であることが分かる
4. 「保存データはこの端末のみ」とアプリ内で明示されている
5. `購入を復元` 導線が設定画面にある
6. 無料ユーザでは保存機能が使えない
7. Pro ユーザでは広告が出ない

## 8. このリポジトリで今見る場所

- 課金初期化: [../src/app/_layout.tsx](../src/app/_layout.tsx)
- 課金ストア: [../src/stores/usePurchaseStore.ts](../src/stores/usePurchaseStore.ts)
- Pro 設定画面: [../src/app/settings.tsx](../src/app/settings.tsx)
- 保存済みプロジェクト一覧: [../src/app/projects.tsx](../src/app/projects.tsx)
- editor の保存/広告分岐: [../src/app/editor/[id].tsx](../src/app/editor/[id].tsx)
- ローカル保存本体: [../src/stores/useProjectStore.ts](../src/stores/useProjectStore.ts)

## 参考

- Apple App Store Connect Help: Manage In-App Purchases
  - https://developer.apple.com/help/app-store-connect/manage-in-app-purchases/
- Apple App Store Connect Help: View agreements status
  - https://developer.apple.com/help/app-store-connect/manage-agreements/view-agreements-status/
- RevenueCat Docs
  - https://www.revenuecat.com/docs/
- RevenueCat Docs: Displaying Products / Offerings
  - https://www.revenuecat.com/docs/displaying-products
- Expo Docs: Development builds
  - https://docs.expo.dev/develop/development-builds/create-a-build
- Expo Docs: EAS environment variables
  - https://docs.expo.dev/eas/environment-variables/
