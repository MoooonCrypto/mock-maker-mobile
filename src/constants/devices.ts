import { DeviceFrame } from '../types';

export const devices: DeviceFrame[] = [
  // iPhone
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
    deviceId: 'iphone-15-pro',
    category: 'iphone',
    name: 'iPhone 15 Pro',
    screenSize: { width: 393, height: 852 },
    frameImageUri: '',
    screenOffset: { x: 0, y: 0 },
  },
  {
    deviceId: 'iphone-15',
    category: 'iphone',
    name: 'iPhone 15',
    screenSize: { width: 393, height: 852 },
    frameImageUri: '',
    screenOffset: { x: 0, y: 0 },
  },
  {
    deviceId: 'iphone-14-pro',
    category: 'iphone',
    name: 'iPhone 14 Pro',
    screenSize: { width: 390, height: 844 },
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
  // iPad
  {
    deviceId: 'ipad-pro-13',
    category: 'ipad',
    name: 'iPad Pro 13"',
    screenSize: { width: 1024, height: 1366 },
    frameImageUri: '',
    screenOffset: { x: 0, y: 0 },
  },
  {
    deviceId: 'ipad-pro-11',
    category: 'ipad',
    name: 'iPad Pro 11"',
    screenSize: { width: 834, height: 1194 },
    frameImageUri: '',
    screenOffset: { x: 0, y: 0 },
  },
  {
    deviceId: 'ipad-air',
    category: 'ipad',
    name: 'iPad Air',
    screenSize: { width: 820, height: 1180 },
    frameImageUri: '',
    screenOffset: { x: 0, y: 0 },
  },
  // Mac
  {
    deviceId: 'macbook-pro-16',
    category: 'mac',
    name: 'MacBook Pro 16"',
    screenSize: { width: 1728, height: 1117 },
    frameImageUri: '',
    screenOffset: { x: 0, y: 0 },
  },
  {
    deviceId: 'macbook-pro-14',
    category: 'mac',
    name: 'MacBook Pro 14"',
    screenSize: { width: 1512, height: 982 },
    frameImageUri: '',
    screenOffset: { x: 0, y: 0 },
  },
  {
    deviceId: 'imac-24',
    category: 'mac',
    name: 'iMac 24"',
    screenSize: { width: 2240, height: 1260 },
    frameImageUri: '',
    screenOffset: { x: 0, y: 0 },
  },
];

export const deviceCategories = [
  { key: 'iphone' as const, label: 'iPhone' },
  { key: 'ipad' as const, label: 'iPad' },
  { key: 'mac' as const, label: 'Mac' },
] as const;
