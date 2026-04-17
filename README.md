## ehlewis.github.io

Static Eleventy site with Cloudflare R2 photo gallery support.

### Features

- Eleventy-based static site generator
- Responsive image handling
- Automatic gallery discovery from R2
- GitHub Actions build and deploy pipeline

## Requirements

- Node.js
- npm
- Cloudflare R2 credentials
- GitHub repo with Pages enabled (for deploy)

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
    ```

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

Output is written to dist.

## Gallery Setup

Photos are stored in Cloudflare R2 under `photos/<gallery-name>/`.

Eleventy automatically discovers galleries and generates `/photos/<slug>/index.html`.

The photo shortcode handles responsive images with lazy loading.

Example R2 structure:

```
photos/
└── Gallery/
    ├── img1.jpg
    ├── img2.jpg
    └── img3.jpg
```

## GitHub Actions Deployment

### Environment variables

Store these values in GitHub repository secrets:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY`
- `R2_SECRET_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_URL`

### Workflow

1. GitHub Actions runs the build using the R2 environment variables.
2. The dist folder is generated and uploaded as an artifact.
3. The site is deployed to GitHub Pages.

### Notes

- Ensure GitHub Pages is configured for the repo.
- Confirm `R2_PUBLIC_URL` matches the CDN or public URL used for served images.

