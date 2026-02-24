/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2b8cee',
          dark: '#1a6fc2',
          light: '#5ba8f5',
        },
        surface: {
          DEFAULT: '#f6f7f8',
          dark: '#101922',
        },
        card: {
          DEFAULT: '#ffffff',
          dark: '#1c1c1e',
        },
      },
      borderRadius: {
        DEFAULT: '12px',
      },
      fontFamily: {
        inter: ['Inter'],
      },
    },
  },
  plugins: [],
};
