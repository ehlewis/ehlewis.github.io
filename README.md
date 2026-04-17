## ehlewis.github.io

Static Eleventy site with Cloudflare R2 photo gallery support and Cloudflare Worker-based image resizing.

### Features

* Eleventy-based static site generator
* Responsive image handling
* Automatic gallery discovery from R2
* Cloudflare-backed image delivery for thumbnails and full-size viewing
* GitHub Actions build and deploy pipeline

## Requirements

* Node.js
* npm
* Cloudflare R2 credentials
* Cloudflare account with Workers and R2 enabled
* GitHub repo with Pages enabled (for deploy)

## Image Delivery Architecture

The site stores a single high-resolution original image in R2 and serves resized variants through a Cloudflare Worker.

Recommended URL patterns:

* Original: `https://cdn.elew.is/photos/Film/000022590008.jpg`
* Thumbnail: `https://cdn.elew.is/thumb/photos/Film/000022590008.jpg`
* Full-size display: `https://cdn.elew.is/full/photos/Film/000022590008.jpg`
* Custom width: `https://cdn.elew.is/w1200/photos/Film/000022590008.jpg`
* Percent-based variant: `https://cdn.elew.is/p60/photos/Film/000022590008.jpg`

For high-resolution originals, the most practical workflow is to keep one source image in R2 and let the Worker request a resized version from Cloudflare at the edge.

### Suggested sizing conventions

* `thumb` → 300px wide, cropped to a consistent thumbnail shape
* `full` → large display size for viewing pages
* `w####` → exact width in pixels, scaled down to preserve aspect ratio
* `p##` → percentage-based variant for large originals, such as `p60`

For example:

* `thumb` is best for grid tiles
* `w800` is useful for small previews
* `w1200` is a good general-purpose gallery view size
* `w2400` is useful for very high-resolution film scans

## Local Setup

1. Install dependencies

   ```bash
   npm install @11ty/eleventy @11ty/eleventy-img slugify @aws-sdk/client-s3
   ```

2. Set required environment variables

   ```bash
   export R2_ACCOUNT_ID=<your-account-id>
   export R2_ACCESS_KEY=<your-access-key>
   export R2_SECRET_KEY=<your-secret-key>
   export R2_BUCKET=<bucket-name>
   export R2_PUBLIC_URL=https://cdn.example.com
   export IMAGE_ORIGIN_URL=https://origin.example.com
   ```

   `R2_PUBLIC_URL` is the public CDN hostname used by the website.

   `IMAGE_ORIGIN_URL` should point to the image origin that the Worker reads from. This can be a Cloudflare R2 custom domain, a dedicated origin hostname, or any origin route that serves the original image files.

3. Run locally

   ```bash
   npm run dev
   ```

4. Open browser

   Visit `http://localhost:8080`

## Build

Generate the static site into dist:

```bash
npm run build
```

Output is written to `dist`.

## Gallery Setup

Photos are stored in Cloudflare R2 under `photos/<gallery-name>/`.

Eleventy automatically discovers galleries and generates `/photos/<slug>/index.html`.

The photo shortcode handles responsive images with lazy loading.

Example R2 structure:

```text
photos/
└── Gallery/
    ├── img1.jpg
    ├── img2.jpg
    └── img3.jpg
```

Example image usage in templates:

```js
imageUrl('photos/Film/000022590008.jpg', 'thumb')
imageUrl('photos/Film/000022590008.jpg', 'full')
imageUrl('photos/Film/000022590008.jpg', 'w1200')
```

Example frontend helper:

```js
function imageUrl(path, size = 'thumb') {
  return `https://cdn.elew.is/${size}/${path}`;
}
```

## Cloudflare Setup

### 1. Create or confirm the R2 bucket

Create an R2 bucket and upload the original high-resolution images into it.

Keep the originals in a predictable key structure, such as:

```text
photos/Film/000022590008.jpg
photos/Family/000000120003.jpg
```

### 2. Set up a public origin for originals

The Worker needs an origin URL for the source images. The simplest pattern is:

* keep the canonical originals in R2
* expose them through a dedicated origin hostname
* point the Worker at that origin via `IMAGE_ORIGIN_URL`

The public CDN hostname should be the one your website uses, while the origin hostname is what the Worker fetches from.

### 3. Enable Cloudflare Image Resizing

Image resizing must be enabled for the zone that serves the image origin and Worker route.

Recommended transformations:

* thumbnail crop for grid views
* scale-down for full-size views
* automatic format conversion where available

### 4. Add the Worker route

Attach the Worker to the image CDN hostname, for example:

```text
cdn.elew.is/*
```

### 5. Deploy the Worker

Use `wrangler` or the Cloudflare dashboard to deploy the Worker.

## Worker Configuration

### `wrangler.toml`

```toml
name = "image-resizer"
main = "src/worker.js"
compatibility_date = "2026-04-17"

[vars]
IMAGE_ORIGIN_URL = "https://origin.example.com"

[[routes]]
pattern = "cdn.elew.is/*"
zone_name = "elew.is"
```

If you use environment-specific values, store them in Wrangler secrets or per-environment config instead of hardcoding them.

### Worker script

under `scripts/r2_image_resizer.js`

### URL examples

* `https://cdn.elew.is/thumb/photos/Film/000022590008.jpg`
* `https://cdn.elew.is/full/photos/Film/000022590008.jpg`
* `https://cdn.elew.is/w800/photos/Film/000022590008.jpg`
* `https://cdn.elew.is/w1200/photos/Film/000022590008.jpg`

Widths must be one of the following: 300, 400, 600, 800, 1000, 1200, 1600, 2000, 2400

## GitHub Actions Deployment

### Environment variables

Store these values in GitHub repository secrets:

* `R2_ACCOUNT_ID`
* `R2_ACCESS_KEY`
* `R2_SECRET_KEY`
* `R2_BUCKET`
* `R2_PUBLIC_URL`
* `IMAGE_ORIGIN_URL`

### Workflow

1. GitHub Actions runs the build using the R2 environment variables.
2. The dist folder is generated and uploaded as an artifact.
3. The site is deployed to GitHub Pages.

### Notes

* Ensure GitHub Pages is configured for the repo.
* Confirm `R2_PUBLIC_URL` matches the CDN hostname used for served images.
* Confirm `IMAGE_ORIGIN_URL` points to the origin hostname that the Worker can fetch from.
* Cache the image CDN aggressively so resized variants are reused at the edge.
* Keep original uploads in R2 and let the Worker handle all derivative image sizes.
