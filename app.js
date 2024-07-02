import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Server } from "socket.io";
import { availableParallelism } from "node:os";
import cluster from "node:cluster";
import { createAdapter, setupPrimary } from "@socket.io/cluster-adapter";
if (cluster.isPrimary) {
  const numCPUs = availableParallelism();
  // create one worker per available core
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork({
      PORT: 3000 + i,
    });
  }

  // set up the adapter on the primary thread
  setupPrimary();
} else {
  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    connectionStateRecovery: {},
    adapter: createAdapter(),
  });

  const __dirname = dirname(fileURLToPath(import.meta.url));

  app.get("/", (req, res) => {
    res.sendFile(join(__dirname, "./index.html"));
  });

  io.on("connection", (socket) => {
    console.log("user connected");
    socket.on("disconnect", () => {
      console.log("user disconnected");
    });
    socket.on("chat message", (msg) => {
      console.log("message: " + msg);
      io.emit("chat message", msg);
    });
    socket.on("user info", (arg) => {
      console.log(arg);
    });
    socket
      .timeout(5000)
      .emit("request", { foo: "bar" }, "baz", (err, response) => {
        if (err) {
          // the client did not acknowledge the event in the given delay
        } else {
          console.log(response.status); // 'ok'
        }
      });
    // socket.on("hello", (value, callback) => {
    //   // once the event is successfully handled
    //   callback();
    // });
    //this will catch all the events
    socket.onAny((eventName, ...args) => {
      console.log(eventName); // 'hello'
      console.log(args); // [ 1, '2', { 3: '4', 5: ArrayBuffer (1) [ 6 ] } ]
    });
  });

  server.listen(3000, () => {
    console.log("server running at http://localhost:3000");
  });
}
