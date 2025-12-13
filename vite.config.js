import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Polyfill process.env.API_KEY for the browser
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY || ''),
      // Polyfill process.env to prevent "ReferenceError: process is not defined"
      'process.env': {}
    },
    server: {
      host: true,
      port: 5173, 
    },
    preview: {
      host: true,
      port: 4173
    }
  };
});