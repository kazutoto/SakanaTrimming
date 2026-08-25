import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, UserConfig} from 'vite';

export default defineConfig((): UserConfig => {
  return {
    base: process.env.GITHUB_PAGES === 'true' ? '/SakanaTrimming/' : '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      allowedHosts: true,
    },
    preview: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true,
    }
  };
});
