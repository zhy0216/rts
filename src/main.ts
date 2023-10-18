import { argv } from "process";
import fs from "fs";
import { Program } from "./program";
if (argv.length < 3) {
  throw new Error("./main input.rts out.c");
}

const sourceCode = fs.readFileSync(argv[argv.length - 2], {
  encoding: "utf8",
  flag: "r",
});
const program = new Program(sourceCode);
fs.writeFileSync(argv[argv.length - 1], program.emit());
