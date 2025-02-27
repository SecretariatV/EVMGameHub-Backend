import { Server } from "socket.io";

import logger from "@/utils/logger";

import ChatHistorySocketListener from "./modules/chat-history/socket/chat-history.listener";
import CoinflipGameSocketListener from "./modules/coin-flip/socket/coinflip-game.listener";
import CrashGameSocketListener from "./modules/crash-game/socket/crash-game.listener";
import LeaderboardSocketListener from "./modules/leaderboard/socket/leaderboard.listener";
import MineGameSocketListener from "./modules/mine/socket/mine-game.listener";
import PaymentSocketListener from "./modules/payment/socket/payment.listener";

class SocketServer {
  private socketServer: Server;

  constructor(socketServer: Server) {
    this.socketServer = socketServer;
    this.start();
  }

  private start() {
    try {
      new ChatHistorySocketListener(this.socketServer);
      new CrashGameSocketListener(this.socketServer);
      new LeaderboardSocketListener(this.socketServer);
      new PaymentSocketListener(this.socketServer);
      new CoinflipGameSocketListener(this.socketServer);
      new MineGameSocketListener(this.socketServer);

      logger.info("Socket server started");
    } catch (error) {
      logger.error(`Error starting socket server: ${error}`);
    }
  }
}

export default SocketServer;
