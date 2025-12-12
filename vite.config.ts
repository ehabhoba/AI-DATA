import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');

  // Fallback logic for API keys based on user's Vercel configuration
  const apiKey = env.API_KEY || 
                 env.GEMINI_API_KEY_1 || 
                 env.GEMINI_API_KEY || 
                 env.GEMINI_API_KEY_2 || 
                 env.GEMINI_API_KEY_3 || 
                 "";

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
    },
    define: {
      // Correctly stringify the key to replace it in build
      'process.env.API_KEY': JSON.stringify(apiKey),
      // Polyfill process.env to prevent "ReferenceError: process is not defined"
      'process.env': {},
    },
  };
});