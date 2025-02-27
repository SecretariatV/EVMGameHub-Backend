import { Types } from "mongoose";

import { IChatEmitHistory } from "@/modules/chat-history";
import {
  IBetType,
  ICrashGameModel,
  IFormattedGameHistoryType,
  IPendingBetType,
  TFormattedPlayerBetType,
} from "@/modules/crash-game";
import { TChatUser, TLeaderboardUserType } from "@/modules/user/user.types";

export interface IClientToServerEvents {
  hello: () => void;
  //crashgameevents
  auth: (token: string) => void;
  "auto-crashgame-bet": (data: {
    betAmount: number;
    token: string;
    cashoutPoint: number;
    count: number;
  }) => void;
  "join-crash-game": (data: {
    target: number;
    betAmount: number;
    token: string;
  }) => void;
  "bet-cashout": () => void;
  "previous-crashgame-history": (count: number) => void;
  "cancel-auto-bet": () => void;

  //coinflipgameevents
  "create-new-coinflipgame": (data: {
    betAmount: number;
    token: string;
    betCoinsCount: number;
    betSide: boolean;
    betSideCount: number;
  }) => void;
  "join-coinflip-game": (data: { gameId: string; color: string }) => void;

  //minesgame events
  "create-new-minesgame": (data: {
    betAmount: number;
    token: string;
    betMinesCount: number;
  }) => void;
  "mines-rolling": (position: number) => void;
  "mines-cashout": () => void;

  //chat
  "chat-history": () => void;
  "join-chat": (_id: string) => void;
  "get-chat-history": (sentAt: Date) => void;
  message: (message: string) => void;
}

export interface IInterServerEvents {
  ping: () => void;
  //common Events
}

export interface IServerToClientEvents {
  error: (data: string) => void;
  "user banned": () => void;
  "notify-error": (data: string) => void;
  "game-join-error": (data: string) => void;
  "update-wallet": (data: number, token: string) => void;
  "bet-cashout-error": (data: string) => void;
  "bet-cashout-success": (result: any) => void;
  "game-call-bot-error": (error: string) => void;
  "game-call-bot-success": () => void;

  //crashgame Events
  "game-status": (data: {
    players: TFormattedPlayerBetType[];
    game_status: number;
  }) => void;
  "game-bets": (bets: IPendingBetType[]) => void;
  "game-starting": (data: {
    _id: string | null;
    privateHash: string | null;
    timeUntilStart?: number;
  }) => void;
  "game-start": (data: { publicSeed: string }) => void;
  "bet-cashout": (data: {
    userdata: IBetType;
    status: number;
    stoppedAt: number | undefined;
    winningAmount: number;
  }) => void;
  "game-end": (data: { game: IFormattedGameHistoryType }) => void;
  "game-tick": (data: { e: number; p: number }) => void;
  "crashgame-join-success": (data: TFormattedPlayerBetType) => void;
  "previous-crashgame-history": (
    history: Pick<ICrashGameModel, "_id" | "crashPoint" | "players">[]
  ) => void;
  "auto-crashgame-join-success": (data: string) => void;
  connection_kicked: () => void;

  // //conflipgame Events
  // "game-creation-error": (message: string) => void;
  // "new-coinflip-game": (gameData: any) => void;
  // "coinflipgame-join-success": () => void;
  // "coinflipgame-joined": (data: {
  //   _id: string;
  //   newPlayer: ICoinPlayer;
  // }) => void;
  // "coinflipgame-rolling": (data: {
  //   game_id: string;
  //   animation_time: number;
  // }) => void;
  // "coinflipgame-rolled": ({
  //   _id,
  //   randomModule,
  //   coinflipResult,
  //   isEarn,
  // }: {
  //   _id: string;
  //   randomModule: number;
  //   coinflipResult: boolean[];
  //   isEarn: boolean;
  // }) => void;
  // "game-called-bot": (data: { _id: string; playerId: string }) => void;

  // //minesgame events
  // "created-mines-game": (data: number[]) => void;
  // "minesgame-rolled": (data: boolean) => void;
  // "minesgame-ended": (data: {
  //   winAmount: number | null;
  //   mines: number[];
  // }) => void;

  //chat
  message: (data: {
    _id: Types.ObjectId;
    user: TChatUser;
    message: string;
    sentAt: Date;
  }) => void;
  "send-chat-history": (data: {
    message: string;
    chatHistories: IChatEmitHistory[];
  }) => void;

  //leaderboard
  "leaderboard-fetch-all": (data: {
    message: string;
    leaderboard: { [key: string]: TLeaderboardUserType[] };
  }) => void;
  // 'leaderboard-bet-update': (data: { game: string; updateData: PendingBetType[] }) => void;
  // 'leaderboard-win-update': (data: { game: string; updateData: BetType }) => void;

  //dashboard
  "dashboard-fetch-all": (data: {
    message: string;
    dashboard: { [key: string]: TLeaderboardUserType[] };
  }) => void;

  "dashboard-pnl": (data: {
    message: string;
    pnl: { [key: string]: number };
  }) => void;
}

export interface ISocketData {
  lastAccess?: number;
  markedForDisconnect?: boolean;
}
