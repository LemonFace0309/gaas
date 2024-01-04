import fs from "fs";
import path from "path";
import { zip } from "lodash";
import axios from "axios";

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
  console.log(`Starting to generate prompts for ${account}`)

  let prompts: string[] = [];

  let idx = 1
  for (const img of imgs) {
    console.log(`Generating prompt #${idx}`);
    let prompt = await getPrompt(img);

    if (!prompt) {
      console.log(`No prompt was returned for ${idx}. Defaulting to ""`);
      prompt = "";
    }

    prompts.push(prompt);
    idx += 1
  }

  console.log(`Done generating prompts for ${account}`)
  return prompts;
}

async function generateImg(img: string, prompt: string) {
  try {
    const res = await client.post<{
      images: string[];
    }>("/img2img", {
      prompt,
      negative_prompt: NEGATIVE_PROMT,
      init_images: [img],
    });
    return res.data.images[0];
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
  console.log(`Starting to generate images fro ${account}`)
  const imgClipPairs = zip(imgs, prompts);

  let idx = 1
  for (const [img, prompt] of imgClipPairs) {
    if (!img || !prompt) {
      continue;
    }

    console.log("prompt:", prompt);

    console.log(`Generating image #${idx}`);
    const generatedImg = await generateImg(img, prompt);

    if (!generatedImg) {
      console.log(`No image was returned for ${idx}`);
      continue;
    }

    const buffer = Buffer.from(generatedImg, "base64");

    const generatedImgDir = path.join(outputDir, account);

    if (!fs.existsSync(generatedImgDir)) {
      fs.mkdirSync(generatedImgDir, { recursive: true });
    }
    const generatedImgPath = path.join(generatedImgDir, `${idx}.jpg`);

    fs.writeFileSync(generatedImgPath, buffer);
    idx++;
  }

  console.log(`Done generating images for ${account}`);
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
