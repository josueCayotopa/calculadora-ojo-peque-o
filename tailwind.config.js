/** @type {import('tailwindcss').Config} */
// Colores oficiales Clínica La Luz (ver contexto/LINEA_GRAFICA.md)
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#b0191a', // CLL Granate
          10: 'rgba(176, 25, 26, 0.1)',
          50: '#fdf2f2',
          100: '#fde8e8',
          200: '#fbd5d5',
          700: '#b0191a',
          800: '#9b1c1c',
          900: '#7f1d1d',
        },
        slateGray: {
          DEFAULT: '#5f6263', // Gris corporativo
          50: '#f9fafb',
          100: '#f3f4f6',
          500: '#5f6263',
        },
        lightBg: { DEFAULT: '#f5f7fa' },
        ink: '#1f2324', // texto principal (tono más oscuro que slateGray)
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      scale: { 102: '1.02' },
    },
  },
  plugins: [],
};
