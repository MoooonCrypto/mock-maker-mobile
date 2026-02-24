# 11 状態管理テスト

対象: `src/stores/useEditorStore.ts`, `src/stores/useSettingsStore.ts`

---

## useEditorStore

### TC-11-001: セッション名の設定

- **前提条件**: エディターストアが初期状態
- **手順**:
  1. `setSessionName('テストプロジェクト')` を呼び出す
- **期待結果**:
  - sessionName が「テストプロジェクト」になる
  - デフォルト値は「無題のモックアップ」
- **重要度**: High

---

### TC-11-002: レイヤーの追加と更新

- **前提条件**: エディターストアが初期状態
- **手順**:
  1. `addLayer(layer)` でレイヤーを追加する
  2. `updateLayer(id, { cornerRadius: 20 })` で更新する
- **期待結果**:
  - 追加後: layers 配列に1件追加される
  - 更新後: 該当レイヤーの cornerRadius が 20 になり、他のプロパティは変更されない
- **重要度**: Critical

---

### TC-11-003: 選択中レイヤーの削除時の選択クリア

- **前提条件**: レイヤーA が追加され、selectedLayerId が A の id
- **手順**:
  1. `removeLayer(layerA.id)` を呼び出す
- **期待結果**:
  - layers から A が削除される
  - selectedLayerId が null になる
- **重要度**: High

---

### TC-11-004: 非選択レイヤーの削除

- **前提条件**: レイヤーA,B が存在、A が選択されている
- **手順**:
  1. `removeLayer(layerB.id)` を呼び出す
- **期待結果**:
  - layers から B が削除される
  - selectedLayerId は A の id のまま変化しない
- **重要度**: Medium

---

### TC-11-005: ストアのリセット

- **前提条件**: レイヤー3件、deviceFrame 設定済み、背景変更済み、sessionName 設定済み
- **手順**:
  1. `reset()` を呼び出す
- **期待結果**:
  - sessionName: '無題のモックアップ'
  - layers: []
  - selectedLayerId: null
  - deviceFrame: null
  - background: デフォルトグラデーション
  - activeTool: 'select'
  - canvasRef: null
- **重要度**: High

---

### TC-11-006: ストア初期状態確認

- **前提条件**: ストアが初期状態
- **手順**:
  1. 各フィールドの初期値を確認する
- **期待結果**:
  - sessionName: '無題のモックアップ'
  - layers: []
  - selectedLayerId: null
  - deviceFrame: null
  - background: { type: 'gradient', gradient: { colors: ['#667eea', '#764ba2'], angle: 135 } }
  - activeTool: 'select'
  - canvasRef: null
- **重要度**: Medium

---

## useSettingsStore

### TC-11-007: デフォルト設定値

- **前提条件**: ストアが初期状態（AsyncStorage にデータなし）
- **手順**:
  1. `defaultExport` の値を確認する
- **期待結果**:
  - format: 'png'
  - quality: 'high'
  - scale: 2
- **重要度**: High

---

### TC-11-008: 設定の部分更新

- **前提条件**: デフォルト設定状態
- **手順**:
  1. `setDefaultExport({ format: 'jpg' })` を呼び出す
- **期待結果**:
  - format が 'jpg' に変更される
  - quality は 'high' のまま（未指定のプロパティは維持）
  - scale は 2 のまま
- **重要度**: High

---

### TC-11-009: 設定の永続化と復元

- **前提条件**: format を 'jpg' に変更済み
- **手順**:
  1. `loadSettings()` を呼び出す（AsyncStorage からの復元をシミュレート）
- **期待結果**:
  - format が 'jpg' として復元される
  - quality が 'high' として復元される
- **重要度**: Critical

---

### TC-11-010: 設定復元時のエラーハンドリング

- **前提条件**: AsyncStorage に不正な JSON が格納されている
- **手順**:
  1. `loadSettings()` を呼び出す
- **期待結果**:
  - エラーをスローせず、デフォルト値が維持される
  - format: 'png', quality: 'high', scale: 2
- **重要度**: Medium
