import { DeviceFrame } from '../types';

export const devices: DeviceFrame[] = [
  {
    deviceId: 'iphone-16-pro-max',
    category: 'iphone',
    name: 'iPhone 16 Pro Max',
    screenSize: { width: 440, height: 956 },
    frameImageUri: '',
    screenOffset: { x: 0, y: 0 },
  },
  {
    deviceId: 'iphone-16-pro',
    category: 'iphone',
    name: 'iPhone 16 Pro',
    screenSize: { width: 402, height: 874 },
    frameImageUri: '',
    screenOffset: { x: 0, y: 0 },
  },
  {
    deviceId: 'iphone-se-3',
    category: 'iphone',
    name: 'iPhone SE (3rd gen)',
    screenSize: { width: 375, height: 667 },
    frameImageUri: '',
    screenOffset: { x: 0, y: 0 },
  },
];

export const deviceCategories = [
  { key: 'iphone' as const, label: 'iPhone' },
] as const;
