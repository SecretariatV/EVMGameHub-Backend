import { FilterQuery } from "mongoose";

import { TQueryPageInfo } from "@/constant/enum";
import { CustomError } from "@/utils/helpers";
import * as localizations from "@/utils/localizations";
import ILocalization from "@/utils/localizations/localizations.interface";

import { IAuthInfo } from "../auth/auth.types";
import { LeaderboardController, LeaderboardService } from "../leaderboard";
import { PaymentService } from "../payment";
import { SiteTransactionService } from "../site-transaction";
import TraitController from "../trait/trait.controller";
import UserService from "../user/user.service";
import { EFilterDate, EHistoryType, ERevenueType } from "./dashboard.constant";
import { DashboardService } from "./dashboard.service";
import { TDashboardDocumentType } from "./dashboard.types";

export class DashboardController {
  // Services
  private dashboardService: DashboardService;
  private userService: UserService;
  private leaderboard: LeaderboardService;
  private siteTransactionService: SiteTransactionService;
  private paymentService: PaymentService;
  private leaderboardController: LeaderboardController;
  private traitController: TraitController;
  // Diff services
  private localizations: ILocalization;

  constructor() {
    this.dashboardService = new DashboardService();
    this.leaderboard = new LeaderboardService();
    this.leaderboardController = new LeaderboardController();
    this.traitController = new TraitController();
    this.userService = new UserService();
    this.siteTransactionService = new SiteTransactionService();
    this.paymentService = new PaymentService();

    this.localizations = localizations["en"];
  }

  public getAll = async () => {
    const dashboardFilter = <FilterQuery<TDashboardDocumentType>>{};
    const [item, count] = await Promise.all([
      this.dashboardService.get(dashboardFilter),
      this.dashboardService.getCount(dashboardFilter),
    ]);

    return {
      item,
      count,
    };
  };

  public getByName = async (name) => {
    const leaderboard = await this.dashboardService.getItem({ name });

    // need add to localizations
    if (!leaderboard) {
      throw new CustomError(404, "Dashboard not found");
    }

    return leaderboard;
  };

  public getById = async (dashboardId) => {
    const dashboard = await this.dashboardService.getItemById(dashboardId);

    // need add to localizations
    if (!dashboard) {
      throw new CustomError(404, "Dashboard not found");
    }

    return dashboard;
  };

  public create = async (dashboard) => {
    try {
      return await this.dashboardService.create(dashboard);
    } catch (error) {
      if (error.code === 11000) {
        throw new CustomError(409, this.localizations.ERRORS.OTHER.CONFLICT);
      }

      throw new Error(this.localizations.ERRORS.OTHER.SOMETHING_WENT_WRONG);
    }
  };

  public update = async ({ id }, dashboardData) => {
    try {
      const dashboard = await this.dashboardService.updateById(
        id,
        dashboardData
      );

      // need add to localizations
      if (!dashboard) {
        throw new CustomError(404, "Dashboard not found");
      }

      return dashboard;
    } catch (error) {
      if (error.code === 11000) {
        throw new CustomError(409, this.localizations.ERRORS.OTHER.CONFLICT);
      } else if (error.status) {
        throw new CustomError(error.status, error.message);
      } else {
        throw new Error(this.localizations.ERRORS.OTHER.SOMETHING_WENT_WRONG);
      }
    }
  };

  public delete = async ({ id }) => {
    const dashboard = await this.dashboardService.deleteById(id);

    // need add to localizations
    if (!dashboard) {
      throw new CustomError(404, "Dashboard not found");
    }

    return dashboard;
  };

  public getDashboard = async (query: {
    date: EFilterDate;
    revenueType: ERevenueType;
  }) => {
    const acmeCurrency = (await this.traitController.getAcmeCurrency()).value;
    return await this.dashboardService.getDashboardChart(
      query.date,
      query.revenueType,
      Number(acmeCurrency)
    );
  };

  public getUserLeaderboard = async ({ userId }: IAuthInfo): Promise<any> => {
    const user = await this.userService.getItemById(userId);
    return { data: user.leaderboard ?? null };
  };

  public getUserHistory = async (
    { userId }: IAuthInfo,
    query: { type: EHistoryType } & TQueryPageInfo
  ): Promise<any> => {
    if (query.type === EHistoryType.BETTING) {
      const siteTransactions = await this.siteTransactionService.getPageItems(
        { userId },
        {},
        {},
        query
      )
      const CGameList = ['crash', 'coinflip', 'mine']
      return {
        items: siteTransactions.items.map((item) => {
          const game = CGameList.find((game) => item.reason.toLowerCase().indexOf(game) > -1)
          return {
            first: game,
            second: item.reason,
            third: item.createdAt,
            fourth: item.amount
          };
        }),
        pageInfo: siteTransactions.pageInfo,
      };
    } else if (query.type === EHistoryType.DEPOSIT) {
      const paymentData = await this.paymentService.getPageItems(
        { userId, type: "Deposit" },
        {},
        {},
        query
      );
      return {
        items: paymentData.items.map((item) => {
          return {
            first: item.amount,
            second: item.walletAddress,
            third: item.createdAt,
            fourth: item.txHash,
          };
        }),
        pageInfo: paymentData.pageInfo,
      };
    } else if (query.type === EHistoryType.WITHDRAW) {
      const paymentData = await this.paymentService.getPageItems(
        { type: "Withdraw" },
        {},
        {},
        query
      );
      console.info({ paymentData, userId })
      return {
        items: paymentData.items.map((item) => {
          return {
            first: item.amount,
            second: item.walletAddress,
            third: item.createdAt,
            fourth: item.txHash,
          };
        }),
        pageInfo: paymentData.pageInfo,
      };
    }

    return null;
  };

  public getTopPlayers = async () => {
    const acmeCurrency = (await this.traitController.getAcmeCurrency()).value;
    return await this.leaderboard.fetchTopPlayers(5, Number(acmeCurrency));
  };
}
