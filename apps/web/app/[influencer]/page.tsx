import fs from "fs";
import path from "path";

function getDirectories(curDir: string) {
  const dir = path.join(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "..",
    "..",
    "packages",
    "scripts",
    ".generated",
    curDir
  );

  if (!fs.existsSync(dir)) {
    return [];
  }

  const dirs = fs.readdirSync(dir).filter((file) => {
    return fs.lstatSync(path.join(dir, file)).isDirectory();
  });

  return dirs;
}

export default function Page({ params }: { params: { influencer: string } }) {
  const dirs = getDirectories(params.influencer);

  return (
    <div>
      <h1 className="text-xl">{params.influencer}</h1>
      <ul>
        {dirs.map((dir) => (
          <li key={dir}>
            <a href={`${params.influencer}/${dir}`} className="hover:underline">{dir}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}



