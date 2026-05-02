# AdMob 進捗メモ

日付: 2026-04-28

## 現在の状況

- AdMob のアプリ確認はまだ完了していない。
- アプリ側では広告リクエストを送れる状態だが、この iOS アプリに対する `app-ads.txt` 検証結果が AdMob 側にまだ反映されていない。
- 現在の AdMob 表示では、`app-ads.txt` に紐づく広告リクエストをまだ十分に検出できていない。

## 確認済み

- App Store の `Developer Website` は以下を向いている。
  - `https://mockmaker-site.pages.dev/`
- `app-ads.txt` は以下で取得できる。
  - `https://mockmaker-site.pages.dev/app-ads.txt`
- 現在の `app-ads.txt` の内容は以下。

```txt
google.com, pub-2543814564794464, DIRECT, f08c47fec0942fa0
```

- App Store の本番ページから `Developer Website` を開くと、正しく上記サイトへ遷移する。
- 最新のストア版ビルドでは、起動時の初期表示問題は解消済み。

## 現時点の見立て

- 設定自体は概ね正しい。
- 残っている問題は、AdMob 側のクロール反映または広告トラフィック検出の遅延である可能性が高い。
- 新規公開直後かつ低トラフィックの iOS アプリで起こりうる挙動と整合している。

## 次にやること

1. App Store の本番アプリを使い、保存 / 書き出し導線から広告リクエストを数回発生させる。
2. AdMob が最近の広告リクエストを検出し、`app-ads.txt` ステータスを更新するのを待つ。
3. しばらく時間を置いてから、AdMob の `app-ads.txt` タブを再確認する。
4. 数日たっても変化がなければ、AdMob 側の `app-ads.txt` ステータス詳細を再度確認する。

