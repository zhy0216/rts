import * as path from "path";
import execa from "execa";
import { testFixtures } from "../helper";

describe("testStatement", async () => {
  const projectRoot = __dirname.split(path.sep).slice(0, -2).join(path.sep);
  const fixturePath = [projectRoot, "fixtures", "statement"].join(path.sep);

  await execa.command(`mkdir -p /tmp${fixturePath}`);

  await testFixtures(fixturePath);
});
