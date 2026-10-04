import { defineConfig } from 'vite';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/*
 * Hero media. Put public/hero.mp4 (and optionally public/hero-poster.jpg) in the project
 * and rebuild: the hero gets a muted, looping background video that script.js loads only
 * after the page is idle. Without the file nothing is injected, so nothing can 404.
 */
function heroMedia() {
  let publicDir = 'public';
  return {
    name: 'lpr:hero-media',
    configResolved(config) {
      publicDir = config.publicDir;
    },
    transformIndexHtml(html) {
      const has = (file) => Boolean(publicDir) && existsSync(join(publicDir, file));
      let media = '';
      if (has('hero.mp4')) {
        const poster = has('hero-poster.jpg') ? ' poster="/hero-poster.jpg"' : '';
        media =
          `<div class="atmos__media"><video class="atmos__video" data-src="/hero.mp4"${poster}` +
          ' muted loop playsinline autoplay preload="none" disablepictureinpicture disableremoteplayback tabindex="-1"></video>' +
          '<div class="atmos__shade"></div></div>';
      }
      return html.replace('<!--hero-media-->', media);
    },
  };
}

/* Preload the two latin font files the first frame needs (their names are hashed at build time). */
function preloadFonts() {
  let base = '/';
  return {
    name: 'lpr:preload-fonts',
    apply: 'build',
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const fonts = Object.keys(ctx.bundle ?? {}).filter((file) =>
          /(?:^|\/)(?:instrument-serif|geist)-latin-(?:400|wght)-normal-[^/]*\.woff2$/.test(file),
        );
        return fonts.map((file) => ({
          tag: 'link',
          attrs: { rel: 'preload', href: base + file, as: 'font', type: 'font/woff2', crossorigin: true },
          injectTo: 'head-prepend',
        }));
      },
    },
  };
}

/*
 * og.png and apple-touch-icon.png, rendered in the page's own light (scripts/frame-images.mjs).
 * A file with the same name in public/ always wins. Loaded lazily so a rendering problem
 * can only cost the images, never the build.
 */
function frameImages() {
  const renderers = { 'og.png': 'renderOgImage', 'apple-touch-icon.png': 'renderTouchIcon' };
  let root = process.cwd();
  let publicDir = 'public';
  const provided = (name) => Boolean(publicDir) && existsSync(join(publicDir, name));
  const render = async (name) => {
    const images = await import(pathToFileURL(join(root, 'scripts', 'frame-images.mjs')).href);
    return images[renderers[name]]();
  };

  return {
    name: 'lpr:frame-images',
    configResolved(config) {
      root = config.root;
      publicDir = config.publicDir;
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const name = (req.url ?? '').split('?')[0].replace(/^\//, '');
        if (!Object.hasOwn(renderers, name) || provided(name)) return next();
        try {
          const png = await render(name);
          res.setHeader('Content-Type', 'image/png');
          res.end(png);
        } catch (error) {
          next(error);
        }
      });
    },
    async generateBundle() {
      for (const name of Object.keys(renderers)) {
        if (provided(name)) continue;
        try {
          this.emitFile({ type: 'asset', fileName: name, source: await render(name) });
        } catch (error) {
          this.warn(`${name} was not rendered: ${error.message}`);
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [heroMedia(), preloadFonts(), frameImages()],
  build: {
    modulePreload: { polyfill: false },
  },
});
