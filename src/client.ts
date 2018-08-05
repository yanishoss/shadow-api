import { pool, WorkerPool } from "workerpool";
import { parseStruct } from ".\\command";

enum Scope {
  MASTER="master",
  SLAVE="slave",
  ALL="all",
}

interface IStatus extends IStatusSlave, IStatusMaster {}

interface IStatusMaster {
  version: string;
  serial: number;
  isLoggingEnabled: boolean;
  packetUsleep: number;
  frameSendMode: string;
}

interface IStatusSlave {
  encoderCard: string;
  encoderType: string;
  encoderSource: string;
  encoderMode: string;
  encodingQuality: string;
  audioEncoder: string;
  isContentProtectionEnabled: boolean;
  frameWidth: number;
  frameHeight: number;
  screenWidth: number;
  screenHeight: number;
  screenRotation: number;
  screenRate: number;
  controlRate: number;
  colorRange: string;
  customBitrate: number;
}

function outputToStatus(output: {[key: string]: string}): {[key: string]: any} {
  const status: {[key: string]: any} = {};

  Object.keys(output).forEach((key) => {
        switch (key) {
          case "version": 
            status.version = output[key];
            break;
          case "serial number":
            status.serial = parseInt(output[key], 10);
            break;
          case "logging enabled":
            status.isLoggingEnabled = output[key] === "true";
            break;
          case "packet usleep":
            status.packetUsleep = parseInt(output[key], 10);
            break;
          case "encoder card":
            status.encoderCard = output[key];
            break;
          case "encoder type": 
            status.encoderType = output[key];
            break;
          case "encoder source":
            status.encoderSource = output[key];
            break;
          case "encoder mode":
            status.encoderType = output[key];
            break;
          case "content protection":
            status.isContentProtectionEnabled = output[key] === "on";
            break;
          case "frame width":
            status.frameWidth = parseInt(output[key], 10);
            break;
          case "frame height":
            status.frameHeight = parseInt(output[key], 10);
            break;    
          case "screen width":
            status.screenWidth = parseInt(output[key], 10);
            break;
          case "screen height":
            status.screenHeight = parseInt(output[key], 10);
            break;
          // It's not a mistake of mine. It's the way the Blade's engineers named it.
          case  "sreen rotation":
            status.screenRotation = parseInt(output[key], 10);
            break;
          case "screen rate": 
            status.screenRate = parseFloat(output[key].replace(/\[.*\]/, ""));
            break;
          case "control rate":
            status.controlRate = parseFloat(output[key].replace(/\[.*\]/, ""));
            break;
          case "encoding quality":
            status.encodingQuality = output[key];
            break;
          case "color range": 
            status.colorRange = output[key];
            break;
          case "custom bitrate":
            status.customBitrate = parseFloat(output[key]);
            break;
          case "frame send mode":
            status.frameSendMode = output[key];
            break;
          case "audio encoder":
            status.audioEncoder = output[key];
            break;
          }
      });

      return status;
}

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

  public async finish(scope: Scope): Promise<void> {
    await this.run(`finish ${scope}`);
  }

  public async status(scope: Scope): Promise<IStatus | IStatusMaster | IStatusSlave> {
    const output = parseStruct(await this.run(`status ${scope}`)) as {[key: string]: string};

    return scope === Scope.ALL 
    ? outputToStatus(output) as IStatus
    : scope === Scope.MASTER
    ? outputToStatus(output) as IStatusMaster
    : outputToStatus(output) as IStatusSlave;
  }
}
