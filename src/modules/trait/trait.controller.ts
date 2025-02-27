import { FilterQuery } from "mongoose";

import { CustomError } from "@/utils/helpers";
import * as localizations from "@/utils/localizations";
import ILocalization from "@/utils/localizations/localizations.interface";

import { CAcmeTraits } from "./trait.constant";
import TraitService from "./trait.service";
import { ITraitModel } from "./trait.types";

export default class TraitController {
  private baseService: TraitService;

  private localizations: ILocalization;

  constructor() {
    this.baseService = new TraitService();
    this.localizations = localizations["en"];
  }

  public getAll = async () => {
    const traitFilter = <FilterQuery<ITraitModel>>{};
    const [item, count] = await Promise.all([
      this.baseService.get(traitFilter),
      this.baseService.getCount(traitFilter),
    ]);

    return {
      item,
      count,
    };
  };

  public getByName = async (name) => {
    const trait = await this.baseService.getItem({ name });

    // need add to localizations
    if (!trait) {
      throw new CustomError(404, "Trait not found");
    }

    return trait;
  };

  public getById = async (traitId) => {
    const trait = await this.baseService.getItemById(traitId);

    // need add to localizations
    if (!trait) {
      throw new CustomError(404, "Trait not found");
    }

    return trait;
  };

  public create = async (trait) => {
    try {
      return await this.baseService.create(trait);
    } catch (error) {
      if (error.code === 11000) {
        throw new CustomError(409, this.localizations.ERRORS.OTHER.CONFLICT);
      }

      throw new Error(this.localizations.ERRORS.OTHER.SOMETHING_WENT_WRONG);
    }
  };

  public update = async ({ id }, traitData) => {
    try {
      const trait = await this.baseService.updateById(id, traitData);

      // need add to localizations
      if (!trait) {
        throw new CustomError(404, "Trait not found");
      }

      return trait;
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
    const trait = await this.baseService.deleteById(id);

    // need add to localizations
    if (!trait) {
      throw new CustomError(404, "Trait not found");
    }

    return trait;
  };

  public getAcmeCurrency = async () => {
    const currencyTrait = await this.baseService.getItem({
      key: CAcmeTraits.getCurrency.key,
      name: CAcmeTraits.getCurrency.name,
    });
    let currency = currencyTrait?.value;

    if (!currency) {
      currency = await this.baseService.getAcmeCurrencyWithApi();
      await this.baseService.create({
        key: CAcmeTraits.getCurrency.key,
        name: CAcmeTraits.getCurrency.name,
        value: currency,
      });
    }

    return { value: currency };
  };

  public getAcmeTotalStake = async () => {
    const totalStakeTrait = await this.baseService.getItem({
      key: CAcmeTraits.getTotalStake.key,
      name: CAcmeTraits.getTotalStake.name,
    });
    const totalStake = totalStakeTrait?.value ?? 0;
    return { value: totalStake };
  };

  public getTotalRewardAmount = async () => {
    const totalRewardAcmeAmountTrait = await this.baseService.getItem({
      key: CAcmeTraits.stakedAcmeRewardAmount.key,
      name: CAcmeTraits.stakedAcmeRewardAmount.name,
    });
    const totalRewardAcmeAmount = totalRewardAcmeAmountTrait?.value ?? 0;
    return {
      value: { acme: totalRewardAcmeAmount },
    };
  };
}
