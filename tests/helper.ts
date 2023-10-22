import fs from "fs";
import path from "path";
import { transpile } from "../src/program";
import { it, expect } from "bun:test";

export const testFixtures = (fixturePath: string) => {
  fs.readdirSync(fixturePath)
    .filter((f) => f.endsWith("rts"))
    .forEach((file) => {
      it(`test ${file}`, async () => {
        const filePath = [fixturePath, file].join(path.sep);
        const sourceCode = await fs.promises.readFile(filePath, {
          encoding: "utf8",
          flag: "r",
        });
        const expectOutput = await fs.promises.readFile(filePath + ".expect", {
          encoding: "utf8",
          flag: "r",
        });
        const cCode = transpile(sourceCode);
        const exePath = `/tmp${fixturePath}/${file.slice(0, -4)}`;
        const cFile = Bun.file(`${exePath}.c`);
        await Bun.write(cFile, cCode);
        const proc = Bun.spawn(["cc", `${exePath}.c`, "-o", exePath]);
        await proc.exited;
        const r = Bun.spawn([exePath]);
        const output = await new Response(r.stdout).text();
        await r.exited;
        expect(output).toEqual(expectOutput);
        expect(r.exitCode).toEqual(0);
      });
    });
};
