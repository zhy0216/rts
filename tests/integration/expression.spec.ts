import * as path from "path";
import { testFixtures } from "../helper";
import { describe } from "bun:test";
import fs from "fs";

describe("testExpression", () => {
  const projectRoot = import.meta.dir.split("/").slice(0, -2).join("/");
  const fixturePath = [projectRoot, "fixtures", "expression"].join(path.sep);
  
  // Ensure the temp directory exists with proper permissions
  const tempDir = `/tmp/rts-tests/expression`;
  fs.mkdirSync(tempDir, { recursive: true, mode: 0o755 });

  testFixtures(fixturePath);
});
