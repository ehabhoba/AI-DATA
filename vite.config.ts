import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');

  // Collect all potential API keys from environment variables
  // We prioritize explicit numbered keys (GEMINI_API_KEY_1, etc.) and standard API_KEY
  const keys = [
    env.API_KEY,
    env.GEMINI_API_KEY,
    ...Object.keys(env)
      .filter(key => key.startsWith('GEMINI_API_KEY_'))
      .sort((a, b) => {
         // Sort numerically if possible (KEY_1 before KEY_10)
         const numA = parseInt(a.replace('GEMINI_API_KEY_', '')) || 0;
         const numB = parseInt(b.replace('GEMINI_API_KEY_', '')) || 0;
         return numA - numB;
      })
      .map(key => env[key])
  ].filter(k => k && k.length > 10 && k !== 'undefined');

  // Deduplicate keys
  const uniqueKeys = [...new Set(keys)];

  // Join them into a single string to be parsed by the client
  // If no keys are found, this will be an empty string
  const joinedKeys = uniqueKeys.join(',');

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
    },
    define: {
      // Expose the comma-separated list of keys as process.env.API_KEY
      'process.env.API_KEY': JSON.stringify(joinedKeys),
      // Polyfill process.env to prevent "ReferenceError: process is not defined"
      'process.env': {},
    },
  };
});