import * as path from "path";
import execa from "execa";
import fs from "fs";
import { Program } from "../../src/program";
import { expect } from "chai";

describe("testStatement", async () => {
  const projectRoot = __dirname.split(path.sep).slice(0, -2).join(path.sep);
  const fixturePath = [projectRoot, "fixtures", "statement"].join(path.sep);

  execa.commandSync(`mkdir -p /tmp${fixturePath}`);

  fs.readdirSync(fixturePath)
    .filter((f) => f.endsWith("rts"))
    .forEach((file) => {
      it(`test ${file}`, async () => {
        const filePath = [fixturePath, file].join(path.sep);
        const sourceCode = fs.readFileSync(filePath, {
          encoding: "utf8",
          flag: "r",
        });
        const program = new Program(sourceCode);
        const exePath = `/tmp${fixturePath}/${file.slice(0, -4)}`;
        fs.writeFileSync(`${exePath}.c`, program.emit());
        execa.commandSync(`gcc -o  ${exePath} ${exePath}.c`);
        const r = execa.commandSync(exePath);
        expect(r.stdout).to.eq("");
        expect(r.exitCode).to.eq(0);
      });
    });
});
