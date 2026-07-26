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
  }
})