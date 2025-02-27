// need add model to mongo index file
import BaseService from "@/utils/base/service";
import { Dashboard } from "@/utils/db";

import { EFilterDate, ERevenueType } from "./dashboard.constant";
// need add types
import { IDashboardModel } from "./dashboard.interface";

export class DashboardService extends BaseService<IDashboardModel> {
  constructor() {
    super(Dashboard);
  }

  public async getDashboardChart(
    dateType: EFilterDate,
    desiredRevenueType: ERevenueType,
    acmeCurrency: number
  ): Promise<{
    acmeLogs: IDashboardModel[];
    acme_currency: number;
  }> {
    let date = 5;
    let limit = 12;

    switch (dateType) {
      case EFilterDate.hour:
        date = 5;
        limit = 12;
        break;
      case EFilterDate.day:
        date = 60;
        limit = 24;
        break;
      case EFilterDate.week:
        date = 60 * 24;
        limit = 7;
        break;
      case EFilterDate.month:
        date = 60 * 24;
        limit = 30;
        break;
      default:
        date = 60 * 24 * 30;
        limit = 12;
    }

    const revenueLogs = await this.aggregateByPipeline([
      {
        $addFields: {
          insertMod: {
            $mod: [
              {
                $toLong: "$insertDate",
              },
              1000 * 60 * date,
            ],
          },
        },
      },
      {
        $match: {
          insertMod: 0,
          revenueType: Number(desiredRevenueType),
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $limit: limit * 2,
      },
      {
        $sort: {
          createdAt: 1,
        },
      },
    ]);


    const acmefilteredLogs = revenueLogs.filter((log) => log.token === "acme");

    if (acmefilteredLogs.length > 0 && acmefilteredLogs.length === 0) {
      const lastacmeRevenueLog = await this.getLastRevenueLog("acme");
      return {
        acmeLogs: lastacmeRevenueLog,
        acme_currency: 1,
      };
    }

    return {
      acmeLogs: acmefilteredLogs,
      acme_currency: 1,
    };
  }

  private async getLastRevenueLog(token: string): Promise<IDashboardModel[]> {
    return await this.aggregateByPipeline([
      {
        $match: {
          token,
        },
      },
      {
        $sort: {
          insertDate: -1,
        },
      },
      { $limit: 1 },
    ]);
  }
}
