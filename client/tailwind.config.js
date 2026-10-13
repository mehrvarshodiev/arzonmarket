export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {
    colors: { ink: '#0d1420', panel: '#192638', line: '#2b3a4f', accent: '#b7f36b' },
    boxShadow: { glow: '0 12px 50px rgba(183,243,107,.10)' },
    borderRadius: { '2xl': '1.25rem' },
    fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] }
  }},
  plugins: []
};
