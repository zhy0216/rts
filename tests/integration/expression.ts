import * as path from "path";
import execa from "execa";
import { testFixtures } from "../helper";

describe("testExpression", () => {
  const projectRoot = __dirname.split(path.sep).slice(0, -2).join(path.sep);
  const fixturePath = [projectRoot, "fixtures", "expression"].join(path.sep);

  execa.commandSync(`mkdir -p /tmp${fixturePath}`);

  testFixtures(fixturePath);
});
