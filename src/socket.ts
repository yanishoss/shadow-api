import * as net from "net";
import { SOCKET_STOPPED_WORKING } from "./errors";

export function createSocket(): net.Socket {
  const socket: net.Socket = net.createConnection(7040);
  socket.setEncoding("utf8");

  socket.on("close", (hadError: boolean) => {
    if (hadError) {
      throw new Error(SOCKET_STOPPED_WORKING);
    }
  });

  return socket;
}
