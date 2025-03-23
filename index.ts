import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { createRoom, joinRoom, leaveRoom } from "./dbOperations.js";

const app = express();

app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  socket.on("create room", async (cb) => {
    const { success, collabId, name } = await createRoom();
    cb({ success, collabId, name });
  });

  socket.on("join room", async ({ roomId, username }, cb) => {
    const res = await joinRoom(roomId, socket.id, username);

    socket.join(roomId);

    if (res.success) {
      io.to(roomId).emit("user joined", username);
      console.log(`User ${username} successfully joined ${res.name}`);
    }

    cb(res);
  });

  socket.on("disconnect", async () => {
    const res = await leaveRoom(socket.id);

    const {success, collabExists, collabId, username} = res

    if (!success) {
      setTimeout(async () => {
        await leaveRoom(socket.id);
      }, 2000);
    }
    if (success && collabExists){
      console.log("emitting user left");
      
      io.to(collabId).emit("user left", username);
    }
  });
});

const port = process.env.PORT || 8080;

server.listen(port, () => {
  console.log("Server listering at port", port);
});
