interface Option<R> {
  maxResources: number;
  create: () => R;
  destroy: (r: R) => void;
}

export class ResourcePool<R> {
  option: Option<R>;
  availableResources: number;
  waitingTasks: ((r: R) => void)[];

  constructor(option: Option<R>) {
    this.option = option;
    this.availableResources = option.maxResources;
    this.waitingTasks = [];
  }

  async acquire(): Promise<R> {
    return new Promise<R>((resolve) => {
      if (this.availableResources > 0) {
        this.availableResources--;
        resolve(this.option.create());
      } else {
        this.waitingTasks.push(resolve);
      }
    });
  }

  release(r: R) {
    this.waitingTasks[0]?.(r);
    this.option.destroy?.(r);
    this.availableResources++;
    // slow but it is fine: https://bugs.chromium.org/p/v8/issues/detail?id=12730
    this.waitingTasks.shift();
  }
}
