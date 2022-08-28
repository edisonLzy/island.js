import { Plugin } from 'vite';
import {
  CLIENT_ENTRY_PATH,
  DEFAULT_HTML_PATH,
  isProduction,
  THEME_PATH
} from './constants';
import reactPlugin from '@vitejs/plugin-react';
import fs from 'fs-extra';
import { createContext } from 'react';

export function createIslandPlugins() {
  const islandPlugin: Plugin = {
    name: 'internal:vite-plugin-island',
    config(config, env) {
      return {
        resolve: {
          alias: {
            '/@island/theme': `/@fs/${THEME_PATH}`
          }
        }
      };
    },
    transformIndexHtml(html) {
      if (isProduction()) {
        return html;
      }
      // Insert client entry script in development
      // And in production, we will insert it in ssr render
      return {
        html,
        tags: [
          {
            tag: 'script',
            attrs: {
              type: 'module',
              src: `/@fs/${CLIENT_ENTRY_PATH}`
            },
            injectTo: 'body'
          }
        ]
      };
    },
    configureServer(server) {
      return () => {
        server.middlewares.use(async (req, res, next) => {
          if (res.writableEnded) {
            return next();
          }
          if (req.url?.replace(/\?.*/, '').endsWith('.html')) {
            let html = fs.readFileSync(DEFAULT_HTML_PATH, 'utf8');

            try {
              html = await server.transformIndexHtml(
                req.url,
                html,
                req.originalUrl
              );
              res.statusCode = 200;
              res.setHeader('Content-Type', 'text/html');
              res.end(html);
            } catch (e) {
              return next(e);
            }
          }
        });
      };
    }
  };
  return [
    islandPlugin,
    reactPlugin({
      jsxRuntime: 'classic'
    })
  ];
}
