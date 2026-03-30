import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';

const translations = {
  ja: {
    home: {
      subtitle:    'テンプレートを選択してください',
      exportCount: '%{count}枚書き出し',
    },
    templates: {
      single:    { label: 'シングル',      description: 'iPhone 1台・中央配置' },
      double:    { label: 'ダブル',        description: 'iPhone 2台・横並び' },
      topHalf:   { label: 'トップクロップ', description: '画面上部をアップで表示' },
      split:     { label: 'スプリット',    description: '2分割・並べると1台が完成' },
      icon:      { label: 'アイコン',      description: 'アプリアイコン形式・正方形' },
      free:      { label: 'フレームなし',  description: '自由配置・スタンプ' },
    },
    toolbar: {
      frame:      'フレーム',
      canvas:     'キャンバス',
      background: '背景',
      text:       'テキスト',
      sticker:    'スタンプ',
      media:      'メディア',
      layers:     'レイヤー',
      delete:     'ゴミ箱',
    },
    editor: {
      frameSizeLabel:       'フレームサイズ: %{pct}%',
      frameSizeSmall:       '小',
      frameSizeLarge:       '大',
      framePosLabel:        'フレーム横位置',
      framePosLeft:         '左',
      framePosRight:        '右',
      exportTitle:          '書き出し',
      exportSavePhotos:     '写真アプリに保存',
      exportSaveFiles:      'ファイルに保存 / 共有',
      exportCancel:         'キャンセル',
      exportDone2:          '2枚の画像を写真アプリに保存しました',
      exportDonePhotos:     '写真アプリに保存しました',
      exportDoneShared:     '共有しました',
      exportFailed:         '書き出しに失敗しました',
      frameSelectTitle:     'フレームを選択',
      frameSelectMsg:       'どちらのフレームに画像を追加しますか？',
      frameSelectLeft:      '左フレームの画像',
      frameSelectRight:     '右フレームの画像',
      textSectionTitle:     'テキスト',
      textAddBtn:           'テキストを追加',
      textModalTitle:       'テキストを追加',
      textInputPlaceholder: 'テキストを入力...',
      textAddConfirm:       '追加',
      errTitle:             'エラー',
      errPermissionTitle:   '権限エラー',
      errCanvasNotFound:    'キャンバスが見つかりません',
      errPermission:        'フォトライブラリへのアクセスを許可してください',
      errSnapshotFailed:    'スナップショット取得に失敗しました',
      doneTitle:            '完了',
    },
    background: {
      title:            '背景',
      colorPickerTitle: 'カラーを選択',
      colorPickerOk:    '決定',
    },
    layers: {
      title:      'レイヤー',
      empty:      'レイヤーがありません',
      typeImage:  '画像',
      typeVideo:  '動画',
      typeText:   'テキスト: ',
      bgSolid:    '単色',
      bgGradient: 'グラデーション',
      bgImage:    '画像',
      bgLabel:    '背景',
      frame:      'フレーム',
    },
    textEdit: {
      title:       'テキスト編集',
      placeholder: 'テキストを入力',
      fontLabel:   'フォント',
      jaOnlyFonts: '日本語テキストのため日本語対応フォントのみ表示',
      sizeLabel:   '文字サイズ',
      styleLabel:  'スタイル',
      colorLabel:  '文字色',
    },
    sticker: {
      title: 'スタンプ',
    },
    imageCrop: {
      cancel:  'キャンセル',
      title:   'フレームに配置',
      confirm: '追加',
    },
  },

  en: {
    home: {
      subtitle:    'Select a template',
      exportCount: '%{count} exports',
    },
    templates: {
      single:    { label: 'Single',    description: '1 iPhone, centered' },
      double:    { label: 'Double',    description: '2 iPhones side by side' },
      topHalf:   { label: 'Top Crop',  description: 'Zoomed view of screen top' },
      split:     { label: 'Split',     description: '2-part layout, combines into 1' },
      icon:      { label: 'Icon',      description: 'App icon, square format' },
      free:      { label: 'No Frame',  description: 'Free layout & stickers' },
    },
    toolbar: {
      frame:      'Frame',
      canvas:     'Canvas',
      background: 'BG',
      text:       'Text',
      sticker:    'Sticker',
      media:      'Media',
      layers:     'Layers',
      delete:     'Delete',
    },
    editor: {
      frameSizeLabel:       'Frame size: %{pct}%',
      frameSizeSmall:       'S',
      frameSizeLarge:       'L',
      framePosLabel:        'Frame position',
      framePosLeft:         'L',
      framePosRight:        'R',
      exportTitle:          'Export',
      exportSavePhotos:     'Save to Photos',
      exportSaveFiles:      'Save to Files / Share',
      exportCancel:         'Cancel',
      exportDone2:          'Saved 2 images to Photos',
      exportDonePhotos:     'Saved to Photos',
      exportDoneShared:     'Shared successfully',
      exportFailed:         'Export failed',
      frameSelectTitle:     'Select Frame',
      frameSelectMsg:       'Which frame would you like to add the image to?',
      frameSelectLeft:      'Left frame',
      frameSelectRight:     'Right frame',
      textSectionTitle:     'Text',
      textAddBtn:           'Add Text',
      textModalTitle:       'Add Text',
      textInputPlaceholder: 'Enter text...',
      textAddConfirm:       'Add',
      errTitle:             'Error',
      errPermissionTitle:   'Permission Error',
      errCanvasNotFound:    'Canvas not found',
      errPermission:        'Please allow access to your photo library',
      errSnapshotFailed:    'Failed to capture snapshot',
      doneTitle:            'Done',
    },
    background: {
      title:            'Background',
      colorPickerTitle: 'Select Color',
      colorPickerOk:    'Done',
    },
    layers: {
      title:      'Layers',
      empty:      'No layers',
      typeImage:  'Image',
      typeVideo:  'Video',
      typeText:   'Text: ',
      bgSolid:    'Solid',
      bgGradient: 'Gradient',
      bgImage:    'Image',
      bgLabel:    'Background',
      frame:      'Frame',
    },
    textEdit: {
      title:       'Edit Text',
      placeholder: 'Enter text',
      fontLabel:   'Font',
      jaOnlyFonts: 'Showing Japanese-compatible fonts only',
      sizeLabel:   'Font Size',
      styleLabel:  'Style',
      colorLabel:  'Color',
    },
    sticker: {
      title: 'Stickers',
    },
    imageCrop: {
      cancel:  'Cancel',
      title:   'Position in Frame',
      confirm: 'Add',
    },
  },
};

const i18n = new I18n(translations);

const langCode = getLocales()[0]?.languageCode ?? 'en';
i18n.locale = langCode.startsWith('ja') ? 'ja' : 'en';
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

export default i18n;

/** Shorthand translate function */
export function t(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options);
}

/** Map TemplateId → i18n key (top-half → topHalf) */
export function templateKey(id: string): string {
  if (id === 'top-half') return 'topHalf';
  return id;
}
