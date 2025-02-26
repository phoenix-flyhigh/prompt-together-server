import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from 'cors';

const app = express();

app.use(cors())

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3001", // Change to your frontend URL
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true, 
  }
});

io.on("connection", (socket) => {
  io.emit("user joined", socket.id);
  
  socket.on("disconnect", () => {
    io.emit("user left", socket.id);
  });
});

const port = process.env.PORT || 8080;

server.listen(port, () => {
  console.log("Server listering at port", port);
});
