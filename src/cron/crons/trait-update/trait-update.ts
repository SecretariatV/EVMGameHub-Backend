import Cron, { ScheduleOptions } from "node-cron";

import { BaseCron } from "@/cron/crons/base.cron";
import { CAcmeTraits } from "@/modules/trait/trait.constant";
import TraitService from "@/modules/trait/trait.service";
import logger from "@/utils/logger";

export class TraitUpdate extends BaseCron {
  private traitService: TraitService;

  constructor(cronExpression: string, option = <ScheduleOptions>{}) {
    super(cronExpression, option);

    this.traitService = new TraitService();
  }

  public start = () => {
    this.initCron();
  };

  private initCron = () => {
    this.task = Cron.schedule(
      this.cronExpression,
      async () => {
        await this.catchWrapper(this.updateTraitStatus, "updateTraitStatus");
      },
      this.option
    );
  };

  private updateTraitStatus = async () => {
    try {
      const acmeCurrency = await this.traitService.getAcmeCurrencyWithApi();
      await this.traitService.updateOrInsert(
        {
          key: CAcmeTraits.getCurrency.key,
          name: CAcmeTraits.getCurrency.name,
        },
        {
          value: acmeCurrency,
          key: CAcmeTraits.getCurrency.key,
          name: CAcmeTraits.getCurrency.name,
        }
      );
    } catch (error) {
      logger.error(error);
    }
  };
}
