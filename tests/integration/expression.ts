import * as path from "path";
import execa from "execa";
import { testFixtures } from "../helper";

describe("testExpression", async () => {
  const projectRoot = __dirname.split(path.sep).slice(0, -2).join(path.sep);
  const fixturePath = [projectRoot, "fixtures", "expression"].join(path.sep);

  await execa.command(`mkdir -p /tmp${fixturePath}`);

  testFixtures(fixturePath);
});
