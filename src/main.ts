import { argv } from "process";
import fs from "fs";
import { transpile } from "./program";
if (argv.length < 3) {
  throw new Error("./main input.rts out.c");
}

const sourceCode = fs.readFileSync(argv[argv.length - 2], {
  encoding: "utf8",
  flag: "r",
});

fs.writeFileSync(argv[argv.length - 1], transpile(sourceCode));
