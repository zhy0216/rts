import { ResourcePool } from "./resourcePool";

async function runFixture(folder: string) {}

async function main() {
  const pool = new ResourcePool({
    maxResources: 5,
    create: () => {},
  });

  pool.acquire().then(() => {
    runFixture("statements");
  });
}

main();
