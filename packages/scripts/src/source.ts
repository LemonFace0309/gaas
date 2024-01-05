import puppeteer, { Page } from "puppeteer";
import { sleep } from "./utils";
import fs from "fs";
import path from "path";

const imgDir = path.join(__dirname, "..", ".images");

async function getAccounts() {
  const stream = fs.createReadStream(
    path.join(__dirname, "..", "src", "sources.txt"),
    "utf-8"
  );

  let accounts = "";

  for await (const chunk of stream) {
    accounts += chunk;
  }

  return accounts.split("\n");
}

async function saveImage(page: Page, url: string, outputPath: string) {
  // Fetch the image as a Base64 string
  const base64String: string | undefined = await page.evaluate(
    (url: string) => {
      return fetch(url)
        .then((res) => res.blob())
        .then(
          (blob) =>
            new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            })
        )
        .then((dataUrl) => (dataUrl as string).split(",")[1]); // Split and get the Base64 part
    },
    url
  );

  if (!base64String) {
    console.log(`Could not find image element for ${url}`);
    return;
  }

  // Convert Base64 string to binary buffer
  const buffer = Buffer.from(base64String, "base64");

  // Save the buffer as an image file
  fs.writeFileSync(outputPath, buffer);
}

async function main() {
  const accounts = await getAccounts();

  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();

  await page.setViewport({ width: 1080, height: 1024 });

  for (const account of accounts) {
    await page.goto(`https://www.instagram.com/${account}`, {
      waitUntil: "networkidle2",
    });

    await sleep(8000); // Wait for 8 seconds

    const images = await page.evaluate(() => {
      // Select all images and filter those with 'object-fit: cover'
      const allImages: HTMLImageElement[] = Array.from(
        document.querySelectorAll(`img[style*="object-fit: cover"]`)
      );
      return allImages.map((img) => img.src); // Extract the src attribute
    });

    const accountDir = path.join(imgDir, account);
    if (!fs.existsSync(accountDir)) {
      fs.mkdirSync(accountDir, { recursive: true });
    }

    for (const [index, image] of images.entries()) {
      const imagePath = path.join(accountDir, `${index+1}.jpg`);
      await saveImage(page, image, imagePath);
    }
  }

  await browser.close();
}

main();
