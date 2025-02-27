import "dotenv/config";

import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { Server } from "http";
import path from "path";
import { Server as SocketIOServer } from "socket.io";
import customParser from "socket.io-msgpack-parser";
import { fileURLToPath } from "url";

import { ALLOW_HOSTS, PORT, SOCKET_ALLOW_HOSTS } from "@/config";
import authorize from "@/middleware/authorize";
import { errorHandler, routeNotFound } from "@/middleware/error-handler";
import logger from "@/middleware/logger";

import { CronJobs } from "./cron";
import RootRouter from "./root.router";
import SocketServer from "./root.socket";

const filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const dirname = path.dirname(filename);
const limiter = rateLimit({
  max: 100,
  windowMs: 10 * 60 * 1000, // 10 minutes
  message: "Too many requests from this IP, please try again in 10 minutes!",
});

const app = express();
app.use(
  cors({
    origin: ALLOW_HOSTS,
    methods: "OPTIONS,GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  })
);

app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.json({ limit: "50mb" }));
app.use("/api/v1", limiter, logger, authorize, new RootRouter().router);
app.use("/assets", express.static(path.join(dirname, "../assets")));

// install routers
app.get("/", (_, res) => {
  res.status(200).json({
    message: "ACME Bet backend is running",
  });
});

app.use([routeNotFound, errorHandler]);

const httpServer = new Server(app);

const socketServer = new SocketIOServer(httpServer, {
  cors: {
    origin: SOCKET_ALLOW_HOSTS,
    methods: ["GET", "POST"],
    credentials: true,
  },
  parser: customParser,
});

new SocketServer(socketServer);
app.set("socketio", socketServer);

CronJobs.pendingWithdrawCron.start();
CronJobs.dashboardUpdate.start();

httpServer.listen(PORT, () => console.info("Server listening on port " + PORT));
