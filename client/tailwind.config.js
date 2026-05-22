/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // VSCode Theme
        'vscode-dark': '#1e1e1e',
        'vscode-darker': '#252526',
        'vscode-card': '#2d2d30',
        'vscode-hover': '#3e3e42',
        'vscode-border': '#454545',
        'vscode-accent': '#007acc',
        'vscode-text-secondary': '#cccccc',
        'vscode-text-muted': '#858585',
        
        // Warm accent theme
        'p2p-orange': '#f6851b',
        'p2p-orange-dark': '#e2761b',
        'p2p-yellow': '#ffc042',
        
        // Discord (for chat interface)
        'discord-dark': '#202225',
        'discord-gray': '#2f3136',
        'discord-light': '#36393f',
        'discord-lighter': '#40444b',
        'discord-blurple': '#5865f2',
        'discord-text': '#dcddde',
        'discord-muted': '#96989d',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
