import * as path from "path";
import { testFixtures } from "../helper";
import { describe } from "bun:test";

describe("testStatement", () => {
  const projectRoot = import.meta.dir.split("/").slice(0, -2).join("/");
  const fixturePath = [projectRoot, "fixtures", "statement"].join(path.sep);
  Bun.spawnSync(["mkdir", "-p", `/tmp${fixturePath}`]);

  testFixtures(fixturePath);
});
