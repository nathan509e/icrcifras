import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],

    // O site será hospedado na raiz do domínio
    base: '/',

    define: {
      __SUPABASE_URL__: JSON.stringify(env.VITE_SUPABASE_URL || ''),
      __SUPABASE_ANON_KEY__: JSON.stringify(
        env.VITE_SUPABASE_ANON_KEY || ''
      ),
    },

    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    
    server: {
      proxy: {
        '/api-cifraclub': {
          target: 'https://www.cifraclub.com.br',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-cifraclub/, ''),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://www.cifraclub.com.br/'
          }
        }
      }
    }
  }
})