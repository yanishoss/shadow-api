import { Socket } from "net";
import { PromiseSocket } from "promise-socket";
import { CANNOT_WRITE_SOCKET, TIMEOUT_SOCKET } from "./errors";
import { createSocket } from "./socket";

function parse(output: string): string {
  return output
    .split(/o-capture>[.\s]*/)
    .filter(el => el !== "o-capture>" && el !== "")[0];
}

// Store the temporary buffers of the requests.
// The IDs are timestamp.
const buffers: { [id: string]: string } = {};

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
    const bufferId: string = new Date(Date.now()).toUTCString();

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
        resolve(parse(buffers[bufferId]));

        // Free some memory.
        // It's optimization bro !
        delete buffers[bufferId];
      }
    });
  });
}

