/* eslint-disable @next/next/no-img-element */
import fs from "fs";
import path from "path";

const getDir = (influencer: string, post: string) =>
  path.join(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "..",
    "..",
    "..",
    "packages",
    "scripts",
    ".generated",
    influencer,
    post
  );

function getImagesBase64(dir: string) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const images = fs.readdirSync(dir).filter((file) => {
    return fs.lstatSync(path.join(dir, file)).isFile();
  });

  const imagesBase64 = images.map((image) => {
    const imageBase64 = fs.readFileSync(path.join(dir, image), "base64");
    return imageBase64;
  });

  return imagesBase64;
}

export default function Page({
  params,
}: {
  params: { influencer: string; post: string };
}) {
  const dir = getDir(params.influencer, params.post);
  const imagesBase64 = getImagesBase64(dir);

  if (!imagesBase64.length) {
    return <div>No images found</div>;
  }

  return (
    <div className="grid place-items-center h-screen">
      <div className="w-full text-center">
        <h1 className="text-xl font-bold mb-8git ">{params.post}</h1>
        <div className="flex justify-center items-center gap-4">
          {imagesBase64.map((image, idx) => (
            <img
              key={idx}
              alt="Generated Image"
              src={`data:image/jpeg;base64,${image}`}
              className={`w-[20vw] ${idx === 0 ? "ring-2 ring-blue-500" : ""}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
