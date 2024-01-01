import puppeteer, { Browser } from "puppeteer";
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

async function saveImage(browser: Browser, url: string, outputPath: string) {
  const newPage = await browser.newPage();
  await newPage.goto(url);

  // Find the image element
  const imageElement = await newPage.$('img');

  if (!imageElement) {
    console.log(`Could not find image element for ${url}`);
    return
  }

  // Get the image as a buffer
  const imageBuffer = await imageElement.screenshot();

  // Save the buffer to a file
  fs.writeFileSync(outputPath, imageBuffer);

  await newPage.close();
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

    await sleep(10000); // Wait for 10 seconds

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
      const imagePath = path.join(accountDir, `${index}.jpg`);
      await saveImage(browser, image, imagePath);
    }
  }

  await browser.close();
}

main();
