import fs from "fs";
import path from "path";
import { zip } from "lodash";

const imgDir = path.join(__dirname, "..", ".images");

// const API = `http://127.0.0.1:7860/sdapi/v1`

function imageToBase64(filePath: string): string {
  const bitmap = fs.readFileSync(filePath);
  return `data:image/jpg;base64,${Buffer.from(bitmap).toString("base64")}`;
}

function getAccounts() {
  let accounts: string[] = [];

  if (fs.existsSync(imgDir)) {
    const contents = fs.readdirSync(imgDir);

    for (const f of contents) {
      const fullPath = path.join(imgDir, f);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Recursively process subdirectories
        accounts.push(fullPath);
      }
    }
  } else {
    console.log("Directory not found:", imgDir);
  }

  return accounts;
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

function getClip(imgBase64: string) {
  return imgBase64 
}

function main() {
  const accounts = getAccounts();

  for (const account of accounts) {
    const images = getImages(account);
    const clips = images.map((img) => getClip(img))

    const imgPackage = zip(images, clips)
    console.log(imgPackage)
  }
}

main()
