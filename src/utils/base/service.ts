import {
  FilterQuery,
  Model,
  ObjectId,
  PipelineStage,
  QueryOptions,
  UpdateQuery,
} from "mongoose";

import { TQueryPageInfo, TQueryPageResult } from "@/constant/enum";

type Projection<S> = {
  [K in keyof S]: 0 | 1;
};

export default class BaseService<ISchema> {
  protected database: Model<ISchema>;

  constructor(database) {
    this.database = database;
  }

  create(data: Partial<ISchema>): Promise<ISchema> {
    return this.database.create(data);
  }

  createMany(data: ISchema[]): Promise<Array<ISchema>> {
    return this.database.insertMany(data);
  }

  async get(
    search?: FilterQuery<ISchema>,
    projection?: Partial<Projection<ISchema>>,
    options: QueryOptions = {}
  ): Promise<Array<ISchema>> {
    if (!options.sort) {
      options.sort = { createdAt: -1 };
    }

    return this.database.find(search, projection, options).lean();
  }

  async getPageItems(
    search?: FilterQuery<ISchema>,
    projection?: Partial<Projection<ISchema>>,
    options: QueryOptions = {},
    pageInfo: TQueryPageInfo = {
      page: 0,
      limit: 10,
      sortBy: "createdAt",
      sortOrder: "desc",
    }
  ): Promise<{ items: Array<ISchema>; pageInfo: TQueryPageResult }> {
    if (!options.sort) {
      options.sort = { createdAt: -1 };
    }

    const page = parseInt(`${pageInfo.page}`, 10) || 0;
    const limit = parseInt(`${pageInfo.limit}`, 10) || 10;
    const sortBy = pageInfo.sortBy || "createdAt";
    const sortOrder = pageInfo.sortOrder || "desc";

    const skip = page * limit;

    const queryResults = await this.database
      .find(search, projection, options)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder });

    const count = await this.database.countDocuments(search);
    const totalPages = Math.ceil(count / limit);

    return {
      items: queryResults,
      pageInfo: {
        currentPage: page,
        totalPages,
        totalItems: count,
      },
    };
  }

  getRangeItemById(idArr: ObjectId[] | string[], projection?, options?) {
    // @ts-ignore
    return this.get({ _id: { $in: idArr } }, projection, options);
  }

  async getByDateRange(
    startOfDay,
    endOfDay,
    options = {}
  ): Promise<Array<ISchema>> {
    const find = {
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      ...options,
    };
    return this.database.find(find).lean();
  }

  async getItem(
    search: FilterQuery<ISchema>,
    projection?: Partial<
      Projection<ISchema & { createdAt?: 0 | 1; updatedAt?: 0 | 1 }>
    >
  ): Promise<ISchema> {
    return this.database.findOne(search, projection).lean();
  }

  getItemById(id: ObjectId | string, projection?) {
    return this.getItem({ _id: id } as FilterQuery<ISchema>, projection);
  }

  async getCount(search?: FilterQuery<ISchema>): Promise<number> {
    return this.database.countDocuments(search);
  }

  async aggregateByPipeline(query: PipelineStage[]): Promise<Array<any>> {
    const result = await this.database.aggregate(query);
    return result;
  }

  async update(
    search: FilterQuery<ISchema>,
    update: UpdateQuery<ISchema>,
    projection?: Partial<Projection<ISchema>>,
    insert?: boolean
  ): Promise<ISchema> {
    const options: QueryOptions = { new: true, projection, lean: true };

    if (insert) {
      options.upsert = true;
    }

    return this.database.findOneAndUpdate(search, update, options);
  }

  updateById(
    id: ObjectId | string,
    update: UpdateQuery<ISchema>,
    projection?: Partial<Projection<ISchema>>
  ) {
    return this.update({ _id: id } as FilterQuery<ISchema>, update, projection);
  }

  updateOrInsert(
    search: FilterQuery<ISchema>,
    update: UpdateQuery<ISchema>,
    projection?: Partial<Projection<ISchema>>
  ) {
    return this.update(search, update, projection, true);
  }

  async delete(
    search: FilterQuery<ISchema>,
    projection?: Partial<Projection<ISchema>>
  ) {
    return this.database.findOneAndDelete(search, { projection, lean: true });
  }

  deleteById(id: ObjectId | string, projection?: Partial<Projection<ISchema>>) {
    return this.delete({ _id: id } as FilterQuery<ISchema>, projection);
  }

  async exists(search: FilterQuery<ISchema>): Promise<boolean> {
    const result = await this.database.exists(search);
    return !!result?._id;
  }
}

export class BaseUpdateService<ISchema> {
  private service: BaseService<ISchema>;
  private data: UpdateQuery<ISchema>;
  private id: string;

  constructor(service: BaseService<ISchema>, id: string) {
    this.service = service;
    this.data = {};
    this.id = id;
  }

  public setField(field: keyof UpdateQuery<ISchema>, value: any) {
    this.data[field] = value;
  }

  public async save() {
    const hasData = Object.keys(this.data).length > 0;

    if (hasData) {
      return this.service.updateById(this.id, this.data);
    }
  }
}
