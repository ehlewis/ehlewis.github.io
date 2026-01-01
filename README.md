## Quick Setup

### Install Requirements

`npm install @11ty/eleventy @11ty/eleventy-img slugify @aws-sdk/client-s3`

### Set Environment Variables

Required for local dev and GitHub Actions:

export R2_ACCOUNT_ID=<your-account-id>
export R2_ACCESS_KEY=<your-access-key>
export R2_SECRET_KEY=<your-secret-key>
export R2_BUCKET=<bucket-name>
export R2_PUBLIC_URL=https://cdn.example.com

    For GitHub Actions, store R2_* secrets in repo settings.


### Build

`npm run build`

Output is written to dist/.
Gallery Setup

    Photos are stored in Cloudflare R2 under photos/<gallery-name>/.

    Eleventy automatically discovers galleries and generates /photos/<slug>/index.html.

    The photo shortcode handles responsive images with lazy loading.

Example R2 object structure:

photos/
└── Gallery/
    ├── img1.jpg
    ├── img2.jpg
    └── img3.jpg

### Run Locally

`npm run dev`

Visit http://localhost:8080 to preview.

### GitHub Actions Deployment

Workflow:

    Build site (npm run build) using R2 environment variables.

    Upload dist/ as artifact.

    Deploy to GitHub Pages.
