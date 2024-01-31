import fs from "fs";
import path from "path";
import { zip } from "lodash";
import axios from "axios";
import sharp from "sharp";

const sourceDir = path.join(__dirname, "..", ".images");
const outputDir = path.join(__dirname, "..", ".generated");

const PROMPT_SUFFIX =
  "head tilt, (looking at viewer:1.5), complex, korean, (large breasts:1.5), detailed background, dramatic lighting";
const NEGATIVE_PROMT =
  "badhandv4, paintings, sketches, (worst quality:2), (low quality:2), (normal quality:2), lowres, normal quality, ((monochrome)), ((grayscale)), skin spots, acnes, skin blemishes, age spot, manboobs, double navel, muted arms, fused arms, analog, analog effects, bad architecture, watermark, (mole:1.5), EasyNegative";

const API = `http://127.0.0.1:7860/sdapi/v1`;

const client = axios.create({
  baseURL: API,
});

function imageToBase64(filePath: string): string {
  const bitmap = fs.readFileSync(filePath);
  return `data:image/jpg;base64,${Buffer.from(bitmap).toString("base64")}`;
}

function getAccounts() {
  let accounts: string[] = [];

  if (fs.existsSync(sourceDir)) {
    const contents = fs.readdirSync(sourceDir);

    for (const f of contents) {
      const fullPath = path.join(sourceDir, f);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Recursively process subdirectories
        accounts.push(f);
      }
    }
  } else {
    console.log("Directory not found:", sourceDir);
  }

  return accounts;
}

function getAccountDir(account: string): string {
  return path.join(sourceDir, account);
}

function getImages(dir: string): string[] {
  let base64Images: string[] = [];

  if (fs.existsSync(dir)) {
    const contents = fs.readdirSync(dir);

    for (const f of contents) {
      const fullPath = path.join(dir, f);
      const stat = fs.statSync(fullPath);

      if (stat.isFile()) {
        // Convert image to Base64 and add to array
        base64Images.push(imageToBase64(fullPath));
      }
    }
  } else {
    console.log("Directory not found:", dir);
  }

  return base64Images;
}

async function getPrompt(imgBase64: string) {
  try {
    const res = await client.post<{
      caption: string;
    }>("/interrogate", {
      image: imgBase64,
      model: "clip",
    });
    const clip = res.data.caption + PROMPT_SUFFIX;
    return `${clip}`;
  } catch (err) {
    console.log(`Unable to obtain clip for this image: ${err}`);
  }
  return null;
}

async function getPrompts(account: string, imgs: string[]): Promise<string[]> {
  console.log(
    `%cStarting to generate prompts for ${account}`,
    "font-weight: bold"
  );

  let prompts: string[] = [];

  let idx = 1;
  for (const img of imgs) {
    console.log(`Generating prompt #${idx}`);
    let prompt = await getPrompt(img);

    if (!prompt) {
      console.log(`No prompt was returned for ${idx}. Defaulting to ""`);
      prompt = "";
    }

    prompts.push(prompt);
    idx += 1;
  }

  console.log(`%cDone generating prompts for ${account}`, "font-weight: bold");
  return prompts;
}

function getBase64ImageDimensions(
  imgBase64: string
): Promise<{ width: number; height: number }> {
  const imgSrc = imgBase64.replace(/^data:image\/\w+;base64,/, "");

  const imageBuffer = Buffer.from(imgSrc, "base64");

  return sharp(imageBuffer)
    .metadata()
    .then((metadata) => ({
      width: metadata.width ?? -1,
      height: metadata.height ?? -1,
    }))
    .catch((error) => {
      throw error;
    });
}

async function img2Img(img: string, prompt: string) {
  try {
    const { width, height } = await getBase64ImageDimensions(img);

    console.log(`Image dimensions: ${width}x${height}`);

    const res = await client.post<{
      images: string[];
    }>("/img2img", {
      prompt,
      negative_prompt: NEGATIVE_PROMT,
      init_images: [img],
      cfg_scale: 5,
      steps: 32,
      batch_size: 2,
      n_iter: 2,
      denoising_strength: 0.65,
      sampler_index: "DPM++ 2M Karras",
      include_init_images: true,
      width: width,
      height: height,
    });
    return res.data.images;
  } catch (err) {
    console.log(`Unable to generate image: ${err}`);
  }
  return null;
}

async function generateImgs(
  account: string,
  imgs: string[],
  prompts: string[]
) {
  console.log(
    `%cStarting to generate images for ${account}`,
    "font-weight: bold"
  );
  const imgClipPairs = zip(imgs, prompts);

  let idx = 1;
  for (const [img, prompt] of imgClipPairs) {
    if (!img || !prompt) {
      continue;
    }

    console.log(`Generating image #${idx}.\nPrompt: ${prompt}`);
    const imgs = await img2Img(img, prompt);

    if (!imgs) {
      console.log(`No images were returned for ${idx}`);
      continue;
    }

    let subIdx = 1;
    for (const generatedImg of imgs) {
      const buffer = Buffer.from(generatedImg, "base64");

      const generatedImgDir = path.join(outputDir, account, idx.toString());

      if (!fs.existsSync(generatedImgDir)) {
        fs.mkdirSync(generatedImgDir, { recursive: true });
      }
      const generatedImgPath = path.join(generatedImgDir, `${subIdx}.jpg`);

      fs.writeFileSync(generatedImgPath, buffer);
      subIdx++;
    }
    idx++;
  }

  console.log(`%cDone generating images for ${account}`, "font-weight: bold");
}

async function main() {
  const accounts = getAccounts();

  for (const account of accounts) {
    const accountDir = getAccountDir(account);
    const images = getImages(accountDir).slice(0, 1);
    const prompts = await getPrompts(account, images);

    await generateImgs(account, images, prompts);
  }
}

main();
