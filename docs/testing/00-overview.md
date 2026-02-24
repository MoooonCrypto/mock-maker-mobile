# MockMaker Mobile テスト仕様書

## テスト構成

各機能ごとに独立したテストファイルで管理する。

| # | ファイル | 対象機能 | テストケース数 |
|---|---------|---------|--------------|
| 01 | `01-home-screen.md` | ホーム画面 | 12 |
| 02 | `02-templates-screen.md` | テンプレート画面 | 8 |
| 03 | `03-settings-screen.md` | 設定画面 | 9 |
| 04 | `04-editor-screen.md` | エディター画面 | 16 |
| 05 | `05-frame-select.md` | フレーム選択画面 | 10 |
| 06 | `06-canvas-rendering.md` | キャンバス描画 | 14 |
| 07 | `07-gesture-controls.md` | ジェスチャー操作 | 10 |
| 08 | `08-screenshot-editor.md` | スクショ編集パネル | 12 |
| 09 | `09-layer-panel.md` | レイヤーパネル | 8 |
| 10 | `10-export.md` | 書き出し画面 | 15 |
| 11 | `11-state-management.md` | 状態管理（ストア） | 12 |
| 12 | `12-navigation.md` | ナビゲーション・画面遷移 | 10 |

## テストケースの記法

各テストケースは以下の形式で記述する。

```
### TC-XX-NNN: テスト名

- **前提条件**: テスト実行前に必要な状態
- **手順**:
  1. 操作手順
  2. ...
- **期待結果**: 期待される動作・表示
- **重要度**: Critical / High / Medium / Low
```

## テスト環境

- iOS シミュレータ（iPhone 15 Pro / iPad Pro 11"）
- iOS 実機（Dev Client ビルド）
- `npx expo start` → Dev Client 接続

## 判定基準

- **Pass**: 期待結果どおりに動作する
- **Fail**: 期待結果と異なる動作をする
- **Block**: テスト実行不可（環境・依存の問題）
- **N/A**: 対象外（該当機能が未実装など）
