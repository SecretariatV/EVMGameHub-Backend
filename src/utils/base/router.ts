import { Router } from "express";

export abstract class BaseRouter {
  public router: Router;
  protected constructor() {
    this.router = Router();
  }

  public abstract routes(): void;
}
