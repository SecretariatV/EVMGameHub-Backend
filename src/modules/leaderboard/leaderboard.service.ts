// need add model to mongo index file
import mongoose from "mongoose";

import { ALLOW_GAME_LIST, SITE_USER_ID } from "@/config";
import BaseService from "@/utils/base/service";
import { User } from "@/utils/db";
import logger from "@/utils/logger";

// import { token_currency } from "./leaderboard.constant";
// need add types
import { TLeaderboardDocumentType } from "./leaderboard.types";

export class LeaderboardService extends BaseService<TLeaderboardDocumentType> {
  private gameList = ALLOW_GAME_LIST;

  constructor() {
    super(User);
  }

  getTopLearderboards = async (count: number, acmeCurrency: number) => {
    const ignoreId = SITE_USER_ID;
    const leaderboard: { [key: string]: TLeaderboardDocumentType[] } = {};

    for (const game of this.gameList) {
      const createPipeline = () => [
        {
          $match: { _id: { $ne: new mongoose.Types.ObjectId(ignoreId) } },
        },
        {
          $addFields: {
            totalBetAmount: {
              $sum: {
                $map: {
                  input: { $objectToArray: `$wager.${game}` },
                  as: "token",
                  in: {
                    $cond: {
                      if: { $eq: ["$$token.k", "acme"] },
                      then: {
                        $multiply: ["$$token.v", acmeCurrency],
                      },
                      else: 0,
                    },
                  },
                },
              },
            },
          },
        },
        { $sort: { totalBetAmount: -1 as 1 | -1 } },
        { $limit: count },
        {
          $project: {
            _id: 1,
            username: 1,
            leaderboard: 1,
            avatar: 1,
            createdAt: 1,
            hasVerifiedAccount: 1,
            totalBetAmount: 1,
            rank: 1,
          },
        },
      ];

      const gameLeaderboard = await this.aggregateByPipeline(createPipeline());
      leaderboard[game] = gameLeaderboard;
    }

    return leaderboard;
  };

  fetchTopPlayers = async (
    count: number,
    acmeCurrency: number
  ): Promise<{ [key: string]: { winners: any[]; losers: any[] } } | []> => {
    try {
      const dashboard: { [key: string]: { winners: any[]; losers: any[] } } =
        {};
      const ignoreId = SITE_USER_ID;

      const createPipeline = (game: string, sortOrder: 1 | -1) => [
        {
          $match: { _id: { $ne: new mongoose.Types.ObjectId(ignoreId) } },
        },
        {
          $addFields: {
            totalWinAmount: {
              $sum: {
                $map: {
                  input: {
                    $objectToArray: `$leaderboard.${game}`,
                  },
                  as: "token",
                  in: {
                    $cond: {
                      if: {
                        $eq: ["$$token.k", "acme"],
                      },
                      then: {
                        $multiply: ["$$token.v.winAmount", acmeCurrency],
                      },
                      else: 0,
                    },
                  },
                },
              },
            },
          },
        },
        {
          $addFields: {
            totalBetAmount: {
              $sum: {
                $map: {
                  input: {
                    $objectToArray: `$leaderboard.${game}`,
                  },
                  as: "token",
                  in: {
                    $cond: {
                      if: {
                        $eq: ["$$token.k", "acme"],
                      },
                      then: {
                        $multiply: ["$$token.v.betAmount", acmeCurrency],
                      },
                      else: 0,
                    },
                  },
                },
              },
            },
          },
        },
        {
          $addFields: {
            profit: {
              $subtract: ["$totalWinAmount", "$totalBetAmount"],
            },
          },
        },
        {
          $match: {
            profit: sortOrder === -1 ? { $gt: 0 } : { $lt: 0 },
          },
        },
        { $sort: { profit: sortOrder } },
        { $limit: count },
      ];

      for (const game of this.gameList) {
        const winnersPipeline = createPipeline(game, -1);
        const losersPipeline = createPipeline(game, 1);

        const winners = await User.aggregate(winnersPipeline);
        const losers = await User.aggregate(losersPipeline);

        dashboard[game] = { winners, losers };
      }

      return dashboard;
    } catch (ex) {
      logger.error("Error finding top players", ex);
      return [];
    }
  };
}
