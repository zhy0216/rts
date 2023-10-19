import fs from "fs";
import path from "path";
import execa from "execa";
import { expect } from "chai";
import { transpile } from "../src/program";

export const testFixtures = (fixturePath: string) => {
  fs.readdirSync(fixturePath)
    .filter((f) => f.endsWith("rts"))
    .forEach((file) => {
      it(`test ${file}`, async () => {
        const filePath = [fixturePath, file].join(path.sep);
        const sourceCode = fs.readFileSync(filePath, {
          encoding: "utf8",
          flag: "r",
        });
        const expectOutput = fs.readFileSync(filePath + ".expect", {
          encoding: "utf8",
          flag: "r",
        });
        const cCode = transpile(sourceCode);
        const exePath = `/tmp${fixturePath}/${file.slice(0, -4)}`;
        fs.writeFileSync(`${exePath}.c`, cCode);
        execa.commandSync(`gcc -o  ${exePath} ${exePath}.c`);
        const r = execa.commandSync(exePath);
        expect(r.stdout).to.eq(expectOutput);
        expect(r.exitCode).to.eq(0);
      });
    });
};
