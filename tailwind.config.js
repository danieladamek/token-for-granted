/** @type {import('tailwindcss').Config} */
// Categorical palette = manifest.palette.groups: the route families and the gate colour (KICKOFF §4).
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Iowan Old Style"', '"Palatino Linotype"', 'Palatino', '"Book Antiqua"', 'Georgia', 'serif'],
        body: ['"Avenir Next"', 'Avenir', '"Segoe UI"', '"Gill Sans"', 'system-ui', 'sans-serif'],
        mono: ['"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        ink: { DEFAULT: '#1f1b16', muted: '#5d5750' },
        paper: { DEFAULT: '#faf8f4', 2: '#f1ede6' },
        night: { DEFAULT: '#15130f', 2: '#211d18', ink: '#efeae2', muted: '#b3aca1' },
        cat: { research: '#2a5aa6', people: '#7b2c5e', 'programme-service': '#1f7a63', capacity: '#a85a1f', start: '#4a4a4a', gate: '#8a6d00' },
      },
    },
  },
  plugins: [],
};
