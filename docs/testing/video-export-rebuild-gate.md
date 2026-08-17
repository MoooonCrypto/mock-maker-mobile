# 動画 Export 再構築 ゲート条件

## 目的

このドキュメントは、`single / double` の動画モックアップ機能を
`preview と export が一致する構造` へ作り直す際の、厳格な完了条件を定義する。

このドキュメントの役割は 2 つ。

1. 実装のゴールを `見た目の一致` と `構造の単純化` に固定する
2. 旧経路や暫定経路が再び混ざることを防ぐ

本ドキュメントに反する実装は、たとえ一時的に動いて見えても不合格とする。

---

## 今回の対象

今回の完了対象は次に限定する。

1. `single` の動画 preview/export 一致
2. `double` の動画 preview/export 一致
3. `double` の `左動画 + 右画像` 一致
4. `double` の `左動画 + 右動画` 一致

今回の完了対象外:

- `top-half` の動画 export
- `free` の動画 export
- `split` の動画 export
- Android の動画 export

補足:

- `split` は引き続き `画像のみ`
- `split` では動画選択 UI 自体を出さない

---

## 完了条件

以下を **すべて** 満たした時だけ、今回の全面改修は完了とする。

1. `single` で動画 preview と export が一致する
2. `double` で動画 preview と export が一致する
3. `左動画 + 右画像` で export が preview と一致する
4. `左動画 + 右動画` で export が preview と一致する
5. export 後に
   - 動画の位置飛び
   - 動画の縮小 / 拡大崩れ
   - 黒い謎領域
   - 白い謎領域
   - フレーム二重表示
   - island 二重表示
   が出ない
6. 実装がこのドキュメントの「構造ルール」「禁止事項」に違反しない

---

## 構造ルール

### 1. Scene の単一性

動画 preview と export は、少なくとも次の情報を同じ scene から得ること。

1. `clipRect`
2. `drawRect`
3. `cornerRadius`
4. `zOrder`
5. `frameOverlayRect`

同じ意味の情報を別名や別構造で二重管理してはならない。

### 2. 原点

動画 export の最終描画は、明示的に `top-left origin` を採用すること。

完了条件:

1. 背景
2. 動画
3. 前面フレーム

の 3 要素が、同じ原点系で描画されること。

### 3. clip

動画の見える範囲は `clipRect` のみを真実とする。

禁止:

- export 側で別の clip 意味を追加すること
- preview と export で別の切り抜き定義を使うこと

### 4. 素材基準

iPhone 系フレームの media 表示領域は、`frame_1` の穴を真実とする。

`frame_2` は背景 / 下地素材であり、media 配置の真実にしてはならない。

### 5. 色

動画 export の pixel format / bitmapInfo / colorspace は固定し、明示されていること。

完了条件:

- 背景 PNG と比べて色相が大きく変わらない
- 紫化、緑化、チャンネル崩れが出ない

### 6. スケール

`logical canvas size -> export pixel size` の変換は 1 回だけに制限する。

禁止:

- scene 座標を export 側で再度別比率に解釈し直すこと
- frame だけ別スケールを持つこと
- drawRect と frameOverlayRect で別の拡縮前提を持つこと

### 7. 時刻

動画書き出し時のフレーム生成は、固定 fps を使い、
`frameIndex -> presentationTime` の対応を一意にすること。

完了条件:

- フレーム取得時刻と書き出し時刻の対応が毎回同じ
- 同じ入力動画から毎回同じ見た目が出る

---

## 禁止事項

以下は今回の改修では禁止とする。

1. 旧動画 export ロジックの延命
2. `preview 用 rect` と `export 用 rect` の別定義
3. `scene` を export 側で再解釈すること
4. 中間透明 MOV を作って最後に重ねる方式
5. `AVMutableVideoCompositionLayerInstruction + cropRect` を最終見た目の真実にすること
6. フレーム位置の px 微調整で動画 export を合わせ込むこと
7. 一時的に動いたからという理由で旧経路を残すこと

---

## 実装チェックリスト

### A. 設計チェック

1. 動画 preview が `buildMediaScene()` の `drawRect / clipRect` を使っている
2. 動画 export が同じ `drawRect / clipRect` を使っている
3. iPhone フレームの前面は `frame_1` だけで表現している
4. media 配置基準に `frame_2` を使っていない
5. export が最終描画ピクセルを自前で作っている

### B. 座標系チェック

1. 背景描画は top-left 基準
2. 動画描画は top-left 基準
3. フレーム描画は top-left 基準
4. `drawRect.y` と `clipRect.y` に個別補正がない
5. 上下反転用の補正は 1 箇所だけにある

### C. 色チェック

1. PixelBuffer 生成時の pixel format が固定されている
2. CGContext の bitmapInfo が固定されている
3. 背景 PNG と同じ色味で出る
4. 動画だけ色相が変わらない

### D. 時刻チェック

1. export fps が固定値
2. `presentationTime = frameIndex * frameDuration`
3. 各動画 reader が `presentationTime` 基準で advance している
4. 同じ入力から毎回同じフレーム位置を得る

---

## 受け入れテスト

### T-1 single + 縦動画

期待結果:

1. preview と export の位置が一致
2. preview と export の大きさが一致
3. island / ベゼル位置が一致
4. 黒 / 白の謎領域が出ない
5. フレームが二重化しない

### T-2 single + 横動画

期待結果:

1. 動画の向きが正しい
2. crop が一致
3. 左右反転 / 上下反転がない

### T-3 double + 左動画 + 右画像

期待結果:

1. 左動画が preview と一致
2. 右画像が崩れない
3. 左だけズレない
4. 右だけズレない

### T-4 double + 左動画 + 右動画

期待結果:

1. 左右とも preview と一致
2. 片側だけ位置飛びしない
3. 左右でフレームサイズが揃う

---

## 不合格条件

以下が 1 件でも出たら、今回の実装は未完了とする。

1. 動画が上 / 左 / 右 / 下へ飛ぶ
2. 動画だけ縮小 / 拡大が狂う
3. フレームだけズレる
4. 背景とフレームの間に謎の白領域が出る
5. 黒いはみ出しが出る
6. 色相が崩れる
7. 向きが逆になる
8. preview と export で別の見た目になる

---

## 実機確認の必須項目

以下はコードレビューでは完了扱いにしない。

1. `single + 縦動画`
2. `single + 横動画`
3. `double + 左動画 + 右画像`
4. `double + 左動画 + 右動画`

この 4 ケースが実機で通るまで、今回の全面改修は完了としない。

---

## 提出物

実装完了時に必要なもの:

1. このドキュメントの各チェック結果
2. 実機テスト結果
3. 残件一覧
4. 使用 build 番号
5. 使用テスト素材一覧

