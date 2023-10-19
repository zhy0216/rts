import * as path from "path";
import execa from "execa";
import { testFixtures } from "../helper";

describe("testStatement", () => {
  const projectRoot = __dirname.split(path.sep).slice(0, -2).join(path.sep);
  const fixturePath = [projectRoot, "fixtures", "statement"].join(path.sep);

  execa.commandSync(`mkdir -p /tmp${fixturePath}`);

  testFixtures(fixturePath);
});
