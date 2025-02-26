import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import shortid from "shortid";

const app = express();

app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3001", // Change to your frontend URL
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  },
});

type Room = { [key: string]: { id: string; users: { id: string }[] } };

const rooms: Room = {};


io.on("connection", (socket) => {
  socket.on("createRoom", (cb) => {
    const roomId = shortid.generate();
    const user = { id: socket.id };
    rooms[roomId] = { id: roomId, users: [user] };
    socket.join(roomId);

    console.log("Room created", roomId);
    cb({ success: true, roomId });
  });

  socket.on("join room", ({ roomId }, cb) => {
    if (!rooms[roomId]) {
      return cb({ success: false, message: "Session doesn't exist" });
    }
    if (rooms[roomId].users.length >= 10) {
      return cb({
        success: false,
        message: "Session is crowded, pls start a new session",
      });
    }

    socket.join(roomId);
    const user = { id: socket.id };

    io.to(roomId).emit("user joined", user);
    console.log(`User ${user.id} successfully joined ${roomId}`);

    cb({ success: true, roomId });
  });

  socket.on("disconnect", () => {
    let userRoom;
    for (const roomId in rooms) {
      if (rooms[roomId].users.find((user) => user.id === socket.id)) {
        userRoom === roomId;
        return;
      }
    }
    if (!userRoom) return;
    rooms[userRoom].users = rooms[userRoom].users.filter(
      (user) => user.id !== socket.id
    );

    if (rooms[userRoom].users.length === 0) [delete rooms[userRoom]];

    io.to(userRoom).emit("user left", socket.id);
  });
});

const port = process.env.PORT || 8080;

server.listen(port, () => {
  console.log("Server listering at port", port);
});
