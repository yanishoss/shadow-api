import { worker } from "workerpool";
import { exec } from "./command";

worker({
  exec
});
