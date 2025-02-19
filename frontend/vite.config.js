import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0', // Permet d'accepter des connexions extérieures (depuis le réseau Docker)
    port: 5173,   // Assurez-vous que c'est bien le port utilisé
    allowedHosts: ['ourmusic.fr'],
  }
})
