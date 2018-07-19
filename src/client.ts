import { pool, WorkerPool } from "workerpool";

export class OCaptureClient {
  private pool: WorkerPool = pool(__dirname + "/worker.js");

  public async run(command: string): Promise<string> {
    return this.pool
      .proxy()
      .then(worker => worker.exec(command))
      .then(output => {
        this.pool.terminate(false);
        return output;
      });
  }
}
