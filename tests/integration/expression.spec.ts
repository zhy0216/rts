import * as path from "path";
import { testFixtures } from "../helper";
import { describe } from "bun:test";

describe("testExpression", () => {
  const projectRoot = import.meta.dir.split("/").slice(0, -2).join("/");
  const fixturePath = [projectRoot, "fixtures", "expression"].join(path.sep);
  Bun.spawnSync(["mkdir", " -p /tmp${fixturePath}"]);

  testFixtures(fixturePath);
});
