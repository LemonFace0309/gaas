import puppeteer from "puppeteer";
import { sleep } from "./utils";
import fs from "fs";
import path from "path";

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

    console.log(images); // Outputs the sources of the images
  }

  await browser.close();
}

main();
