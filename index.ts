import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import {
  addMessageToCollab,
  addTypingUser,
  createRoom,
  joinRoom,
  leaveRoom,
  removeTypingUser,
} from "./dbOperations.js";

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
      socket.broadcast
        .to(roomId)
        .emit("user joined", { username, members: res.members });
      console.log(`User ${username} successfully joined ${res.name}`);
    }

    cb(res);
  });

  socket.on(
    "add message",
    async ({ message, byUser, collabId, username }, cb) => {
      try {
        const res = await addMessageToCollab(
          message,
          byUser,
          collabId,
          username
        );

        if (res.success) {
          console.log("added, emitting new message by", username);
          if (byUser) {
            socket.broadcast
              .to(collabId)
              .emit("new message", { message, byUser, username });
          } else {
            io.to(collabId).emit("new message", { message, byUser, username });
          }
        }
        cb({success: true})
      } catch (err) {
        cb({success: false})
      }
    }
  );

  socket.on("started typing", async ({ username, collabId }) => {
    try {
      const users: string[] = await addTypingUser(username, collabId);

      socket.broadcast.to(collabId).emit("typing", { users });
    } catch {
      console.error("failed to add user");
    }
  });

  socket.on("stopped typing", async ({ username, collabId }) => {
    try {
      const users: string[] = await removeTypingUser(username, collabId);

      socket.broadcast.to(collabId).emit("typing", { users });
    } catch {
      console.error("failed to add user");
    }
  });

  socket.on("disconnect", async () => {
    const res = await leaveRoom(socket.id);

    const { success, collabExists, collabId, username } = res;

    if (!success) {
      setTimeout(async () => {
        await leaveRoom(socket.id);
      }, 2000);
    }
    if (success && collabExists) {
      console.log("emitting user left");

      socket.broadcast.to(collabId).emit("user left", username);
    }
  });
});

const port = process.env.PORT || 8080;

server.listen(port, () => {
  console.log("Server listering at port", port);
});
