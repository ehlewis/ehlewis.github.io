const slugify = require("slugify");
const Image = require("@11ty/eleventy-img");
const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");


module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("src/photos");
  require("dotenv").config();

    function slug(name) {
    return slugify(name, {
        lower: true,
        strict: true
    });
    }

  // Eleventy Image short code
  eleventyConfig.addNunjucksAsyncShortcode("photo", async (src, alt, widths = [300, 600, 1200]) => {
    if(!alt) {
      throw new Error(`Missing alt for ${src}`);
    }

    let metadata = await Image(src, {
      widths: widths,
      formats: ["avif", "webp", "jpeg"],
      outputDir: "./dist/photos/",
      urlPath: "/photos/",
    });

    // Pick a default format to display
    let imageAttributes = {
      alt,
      loading: "lazy",
      decoding: "async",
    };

    return Image.generateHTML(metadata, imageAttributes);
  });



    const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY,
        secretAccessKey: process.env.R2_SECRET_KEY
    },
    forcePathStyle: true
    });

  
  // Photo galleries collection
  eleventyConfig.addCollection("galleries", async function () {
    if (!process.env.R2_BUCKET) {
        throw new Error("R2 env vars missing. Did you configure secrets?");
    }

    try {
        const bucket = process.env.R2_BUCKET;
        const baseUrl = process.env.R2_PUBLIC_URL;
        console.log("Searching bucket:", bucket);
        const response = await s3.send(
            new ListObjectsV2Command({
                Bucket: bucket,
                Delimiter: "/",
                Prefix: 'photos/'
            })
        );

        const galleries = [];
        for (const prefix of response.CommonPrefixes || []) {
            const galleryName = prefix.Prefix.replace("photos/", "").replace("/","");
            const gallerySlug = slugify(galleryName, {
                lower: true,
                strict: true
            });
            console.log("GALLERY: ", galleryName);
            const objects = await s3.send(
                new ListObjectsV2Command({
                Bucket: bucket,
                Prefix: prefix.Prefix
                })
            );
            console.log(objects);

            const images = (objects.Contents || [])
                .map(obj => obj.Key)
                .filter(key => key.match(/\.(jpe?g|png|webp)$/i))
                .map(key => {
                    const originalUrl = `${baseUrl}/${key}`;
                    const thumbUrl = `${baseUrl}/w400/${key}`;
                    return {
                        filename: key.split("/").pop(),
                        url: thumbUrl,
                        thumbUrl,
                        originalUrl
                    };
                });
            console.log("IMAGES: ", images);
            galleries.push({ name: galleryName, slug: gallerySlug, images });
        }
        console.log("Discovered galleries:", galleries);
        return galleries;
    } catch (err) {
        console.error("R2 gallery discovery failed:", err);
        throw err;
    }
  });
  

  return {
    dir: {
      input: "src",
      output: "dist",
    }
  };
};
