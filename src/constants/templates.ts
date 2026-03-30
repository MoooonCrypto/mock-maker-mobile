export type TemplateId = 'single' | 'double' | 'top-half' | 'split' | 'icon' | 'free';

export interface TemplateConfig {
  id: TemplateId;
  label: string;
  description: string;
  exportCount: number;
}

export const TEMPLATES: TemplateConfig[] = [
  {
    id: 'single',
    label: 'シングル',
    description: 'iPhone 1台・中央配置',
    exportCount: 1,
  },
  {
    id: 'double',
    label: 'ダブル',
    description: 'iPhone 2台・横並び',
    exportCount: 1,
  },
  {
    id: 'top-half',
    label: 'トップクロップ',
    description: '画面上部をアップで表示',
    exportCount: 1,
  },
  {
    id: 'split',
    label: 'スプリット',
    description: '2分割・並べると1台が完成',
    exportCount: 2,
  },
  {
    id: 'icon',
    label: 'アイコン',
    description: 'アプリアイコン形式・正方形',
    exportCount: 1,
  },
  {
    id: 'free',
    label: 'フレームなし',
    description: '自由配置・スタンプ',
    exportCount: 1,
  },
];

/** キャンバス高さ = screenWidth × この値 */
export function getCanvasHeightMultiplier(templateId: TemplateId): number {
  if (templateId === 'split') return (2688 / 1242) / 2;
  if (templateId === 'free') return 2688 / 1242;
  return 2688 / 1242;
}

export function getCanvasHeight(screenWidth: number, templateId: TemplateId): number {
  return Math.round(screenWidth * getCanvasHeightMultiplier(templateId));
}
