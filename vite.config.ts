import path from 'node:path'
import Vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'

import AutoImport from 'unplugin-auto-import/vite'
import { defineConfig } from 'vite'
import {fileURLToPath, URL} from "node:url";

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {

      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },


  plugins: [
    Vue(),
    vueDevTools(),

    AutoImport({
      imports: ['vue', 'vue-router', 'vue/macros', 'pinia', '@vueuse/core'],
      resolvers: [ElementPlusResolver()],
      dts: 'src/types/auto-imports.d.ts',

    }),
    Components({
      // allow auto load markdown components under `./src/components/`
      extensions: ['vue', 'md'],
      // allow auto import and register components used in markdown
      include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
      resolvers: [
        ElementPlusResolver({
          importStyle: 'sass',
        }),
      ],
      dts: 'src/types/components.d.ts',
    }),

  ],
  server:{
    port:8000
  },
  ssr: {
    // TODO: workaround until they support native ESM
    noExternal: ['element-plus'],
  },
})
