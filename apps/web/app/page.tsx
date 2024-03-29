import fs from "fs";
import path from "path";

function getDirectories() {
  const dir = path.join(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "..",
    "packages",
    "scripts",
    ".generated"
  );

  if (!fs.existsSync(dir)) {
    return [];
  }

  const dirs = fs.readdirSync(dir).filter((file) => {
    return fs.lstatSync(path.join(dir, file)).isDirectory();
  });

  return dirs;
}

export default function Page(): JSX.Element {
  const dirs = getDirectories();

  return (
    <div>
      <h1 className="text-xl">Generated Directories</h1>
      <ul>
        {dirs.map((dir) => (
          <li key={dir}>
            <a href={`/${dir}`} className="hover:underline">{dir}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
