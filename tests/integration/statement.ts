import * as path from "path";
import execa from "execa";
import fs from "fs";

describe("testStatement", async () => {
  const projectRoot = __dirname.split(path.sep).slice(0, -2).join(path.sep);
  const fixturePath = [projectRoot, "fixtures", "statement"].join(path.sep);
  execa.commandSync(`mkdir -p /tmp${fixturePath}`);
  fs.readdirSync(fixturePath)
    .filter((f) => f.endsWith("rts"))
    .forEach((file) => {
      it(`test ${file}`, async () => {
        console.log(file);
      });
    });
});
