/** @type {import('tailwindcss').Config} */
export default {
  // Certifique-se de que o Tailwind escaneie seus arquivos para classes
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx,css}",
  ],
  theme: {
    extend: {
      // Definindo uma paleta de cores medieval
      colors: {
        'medieval-dark': '#2E2B23', // Um marrom muito escuro, quase preto
        'medieval-brown': '#5C4A3A', // Marrom de madeira envelhecida
        'medieval-gray': '#7A7A7A', // Cinza de pedra
        'medieval-gold': '#D4AF37', // Ouro envelhecido
        'medieval-red': '#8B0000', // Vermelho vinho escuro
        'medieval-green': '#4B5320', // Verde musgo escuro
        'medieval-parchment': '#F5DEB3', // Cor de pergaminho
        'medieval-steel': '#A9A9A9', // Cinza de aço
      },
      // Definindo fontes com um toque medieval
      fontFamily: {
        // 'Cinzel Decorative' para títulos ou elementos de destaque
        medievalTitle: ['"Cinzel Decorative"', 'serif'],
        // 'MedievalSharp' para o corpo do texto e UI
        medievalBody: ['"MedievalSharp"', 'cursive'],
        // Manter 'Inter' como fallback ou para elementos mais neutros se necessário
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
