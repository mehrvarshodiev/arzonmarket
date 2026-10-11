export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {
    colors: { ink: '#080a0f', panel: '#11151e', line: '#252b38', accent: '#b7f36b' },
    boxShadow: { glow: '0 12px 50px rgba(183,243,107,.10)' },
    borderRadius: { '2xl': '1.25rem' },
    fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] }
  }},
  plugins: []
};
