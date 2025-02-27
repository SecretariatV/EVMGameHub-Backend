import BaseService from "@/utils/base/service";
import { Trait } from "@/utils/db";

import { ITraitModel } from "./trait.types";

export default class TraitService extends BaseService<ITraitModel> {
  constructor() {
    super(Trait);
  }

  public getAcmeCurrencyWithApi = async () => {
    try {
      const currentTimestamp = new Date();
      const twoHoursAgoTimestamp = new Date(
        currentTimestamp.getTime() - 2 * 60 * 60 * 1000
      );

      const fetchAcmeCurrency = await fetch(
        `https://api.kujira.app/api/trades/candles?contract=kujira19n770r9q5haax7mfgy8acrgz7gsamgyjhcvqvxfgrq25983lc42qtszngq&from=${twoHoursAgoTimestamp.toISOString()}&to=${currentTimestamp.toISOString()}&precision=120`
      );
      const acmeCurrencyData = await fetchAcmeCurrency.json();
      const candles = acmeCurrencyData.candles;

      if (candles && candles.length > 0) {
        const latestCurrency = candles[candles.length - 1].close;
        return Number(latestCurrency).toFixed(4);
      }
    } catch (error) {
      console.error("error", error);
    }

    return "0.02";
  };
}
