export interface StickerDef {
  key: string;
  label: string;
  defaultSize: { width: number; height: number };
}

export interface StickerCategory {
  id: string;
  label: string;
  columns: 2 | 4;
  items: StickerDef[];
}

export const STICKER_CATALOG: StickerCategory[] = [
  {
    id: 'platform',
    label: 'ストア',
    columns: 2,
    items: [
      // 実ファイルサイズ: 1017x1680だが実ロゴは中央の横長帯 (913x322, ratio 2.83:1)
      // fit="cover"でロゴ中央部のみ表示する
      { key: 'ios',     label: 'App Store',   defaultSize: { width: 130, height: 46 } },
      { key: 'android', label: 'Google Play', defaultSize: { width: 130, height: 44 } },
    ],
  },
  {
    id: 'badge',
    label: 'バッジ',
    columns: 4,
    items: [
      { key: 'new',      label: 'NEW',     defaultSize: { width: 72, height: 72 } },
      { key: 'new-1',    label: 'NEW 1',   defaultSize: { width: 72, height: 72 } },
      { key: 'new-2',    label: 'NEW 2',   defaultSize: { width: 72, height: 72 } },
      { key: 'new-3',    label: 'NEW 3',   defaultSize: { width: 72, height: 72 } },
      { key: 'new-4',    label: 'NEW 4',   defaultSize: { width: 72, height: 72 } },
      { key: 'refresh',  label: 'REFRESH', defaultSize: { width: 72, height: 72 } },
      { key: 'update',   label: 'UPDATE',  defaultSize: { width: 72, height: 72 } },
      { key: 'update-1', label: 'UPDATE 1',defaultSize: { width: 72, height: 72 } },
      { key: 'update-2', label: 'UPDATE 2',defaultSize: { width: 72, height: 72 } },
      { key: 'updated',  label: 'UPDATED', defaultSize: { width: 72, height: 72 } },
    ],
  },
];

// Static asset map — require() must be static strings for Metro bundler
export const STICKER_ASSETS: Record<string, ReturnType<typeof require>> = {
  'ios':      require('../../assets/ios.png'),
  'android':  require('../../assets/android.png'),
  'new':      require('../../assets/new.png'),
  'new-1':    require('../../assets/new1.png'),
  'new-2':    require('../../assets/new2.png'),
  'new-3':    require('../../assets/new3.png'),
  'new-4':    require('../../assets/new4.png'),
  'refresh':  require('../../assets/refresh.png'),
  'update':   require('../../assets/update.png'),
  'update-1': require('../../assets/update1.png'),
  'update-2': require('../../assets/update2.png'),
  'updated':  require('../../assets/updated.png'),
};
