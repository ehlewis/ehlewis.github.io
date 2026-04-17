/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
const ALLOWED_WIDTHS = new Set([
  300, 400, 600, 800, 1000, 1200, 1600, 2000, 2400
]);

function buildImageOptions(width) {
  return {
    width,
    fit: 'scale-down',
    quality: 85,
    format: 'auto'
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    let sourcePath = path;
    let imageOptions = null;

    // Thumbnail
    if (path.startsWith('/thumb/')) {
      sourcePath = path.replace('/thumb/', '/');
      imageOptions = {
        width: 300,
        height: 200,
        fit: 'cover',
        gravity: 'auto',
        quality: 80,
        format: 'auto'
      };
    }

    // Full-size alias
    else if (path.startsWith('/full/')) {
      sourcePath = path.replace('/full/', '/');
      imageOptions = buildImageOptions(2400);
    }

    // Width-based resizing
    else {
      const match = path.match(/^\/w(\d+)\/(.+)$/);

      if (match) {
        const width = Number.parseInt(match[1], 10);
        sourcePath = `/${match[2]}`;

        if (!ALLOWED_WIDTHS.has(width)) {
          return new Response('Invalid width preset', { status: 400 });
        }

        imageOptions = buildImageOptions(width);
      }
    }

    const origin = env.IMAGE_ORIGIN_URL;

    if (!origin) {
      return new Response('Missing IMAGE_ORIGIN_URL', { status: 500 });
    }

    const sourceUrl = `${origin}${sourcePath}`;

    if (!imageOptions) {
      return fetch(sourceUrl);
    }

    const res = await fetch(sourceUrl, {
      cf: { image: imageOptions }
    });

    const headers = new Headers(res.headers);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new Response(res.body, {
      status: res.status,
      headers
    });
  }
};