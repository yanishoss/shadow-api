import { Socket } from "net";
import { PromiseSocket } from "promise-socket";
import { CANNOT_WRITE_SOCKET, TIMEOUT_SOCKET } from "./errors";
import { createSocket } from "./socket";

function parseOutput(output: string): string {
  return output
    .split(/o-capture>[.\s]*/)
    .filter(el => el !== "o-capture>" && el !== "")[0];
}

export function parseStruct<T extends {[key: string]: string}>(output: string): T | null {
  const keyRegex: RegExp = /^(.+(?=\s*:))(?<!\s+)/gmi;
  const valueRegex: RegExp = /((?<=:\s*)\S+)$/gmi;
  const struct: {[key: string]: string} = {};

  const keys = output.match(keyRegex);
  const values = output.match(valueRegex);

  if (!keys) {
    return null;
  }

  keys.forEach((key, i) => {
    struct[key] = values ? values[i] : "";
  });

  return struct as T;
}

// Store the temporary buffers of the requests.
// The IDs are timestamp messed up with random numbers.
const buffers: { [id: number]: string } = {};

export function exec(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const promiseSocket: PromiseSocket<Socket> = new PromiseSocket(
      createSocket()
    );

    try {
      promiseSocket.write(command, "utf8");
    } catch (e) {
      reject(new Error(CANNOT_WRITE_SOCKET));
    }

    promiseSocket.setTimeout(3000);
    promiseSocket.stream.setNoDelay(true);

    // The identifier of the request inside the buffer.
    const bufferId: number = Date.now() * Math.random();

    // Reject the promise after 3 seconds of idle state.
    promiseSocket.stream.on("timeout", () => reject(new Error(TIMEOUT_SOCKET)));

    promiseSocket.stream.on("data", (data: string) => {
      if (!buffers[bufferId]) {
        buffers[bufferId] = data;
      } else {
        buffers[bufferId] += data;
      }

      const bufferLines = buffers[bufferId].split("\n");

      // Match if the output is complete.
      // If so, resolve the promise.
      if (
        bufferLines[0].match(/(?=(o-capture)+).*/) &&
        bufferLines[bufferLines.length - 1].match(/(?=(o-capture>)+).*/)
      ) {
        resolve(parseOutput(buffers[bufferId]));

        // Free some memory.
        // It's optimization bro !
        delete buffers[bufferId];
      }
    });
  });
}

