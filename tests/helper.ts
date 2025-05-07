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
        // Use path.basename to get just the directory name, not the full path
        const fixtureName = path.basename(fixturePath);
        // Create a proper temp directory structure
        const tempDir = `/tmp/rts-tests/${fixtureName}`;
        // Ensure the directory exists with proper permissions
        fs.mkdirSync(tempDir, { recursive: true, mode: 0o755 });
        const exePath = `${tempDir}/${file.slice(0, -4)}`;
        const cFilePath = `${exePath}.c`;
        
        // Write the C file
        await Bun.write(cFilePath, cCode);
        
        // Make sure the C file exists before compiling
        if (!fs.existsSync(cFilePath)) {
          throw new Error(`C file not created at ${cFilePath}`);
        }
        
        // Set a timeout for the compilation process to prevent hanging
        const compileOptions = {
          timeout: 3000, // 3 seconds timeout
        };
        
        // Compile with error handling
        const proc = Bun.spawn(["cc", cFilePath, "-o", exePath], compileOptions);
        const compileStatus = await proc.exited;
        
        if (compileStatus !== 0) {
          const stderr = await new Response(proc.stderr).text();
          throw new Error(`Compilation failed with status ${compileStatus}: ${stderr}`);
        }
        
        // Make sure the executable exists before running
        if (!fs.existsSync(exePath)) {
          throw new Error(`Executable not created at ${exePath}`);
        }
        
        // Make the executable file executable
        fs.chmodSync(exePath, 0o755);
        
        // Run the executable with a timeout
        const runOptions = {
          timeout: 3000, // 3 seconds timeout
        };
        
        const r = Bun.spawn([exePath], runOptions);
        const output = await new Response(r.stdout).text();
        const exitCode = await r.exited;
        
        // Cleanup temporary files
        try {
          fs.unlinkSync(cFilePath);
          fs.unlinkSync(exePath);
        } catch (e) {
          console.warn(`Failed to clean up temporary files: ${e}`);
        }
        
        expect(output).toEqual(expectOutput);
        expect(exitCode).toEqual(0);
      });
    });
};
