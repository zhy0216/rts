import { transpile } from "../src/program.js";
import fs from "fs";

// Read the test file
const source = fs.readFileSync("fixtures/statement/tryST1.rts", "utf8");

// Transpile to C
const cCode = transpile(source);

// Write the generated C code to a file for inspection
fs.writeFileSync("tmp/debug_try_catch.c", cCode);

console.log("Generated C code written to tmp/debug_try_catch.c");
