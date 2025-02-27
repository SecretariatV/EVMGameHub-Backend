import bcrypt from "bcryptjs";
import jwt, { UserJwtPayload } from "jsonwebtoken";
import { SiweMessage } from "siwe";
import { sepolia } from "viem/chains";

import { FRONTEND_URL, REFRESH_TOKEN_SECRET } from "@/config";
import { IUserModel } from "@/modules/user/user.interface";
import UserService from "@/modules/user/user.service";
import { CustomError } from "@/utils/helpers";
import * as localizations from "@/utils/localizations";
import ILocalization from "@/utils/localizations/localizations.interface";

import { PaymentService } from "../payment";
import { ROLE } from "../user/user.constant";
import AuthService from "./auth.service";
import { IAuthModel, TSignInPayload } from "./auth.types";

export default class AuthController {
  private service: AuthService;
  private userService: UserService;
  private paymentService: PaymentService;
  private localizations: ILocalization;

  private passwordRegExp = new RegExp(
    /(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z!@#$%^&*]{6,}/g
  );

  constructor() {
    this.service = new AuthService();
    this.userService = new UserService();
    this.paymentService = new PaymentService();

    this.localizations = localizations["en"];
  }

  // username signUp
  signUp = async (data: Partial<IUserModel> & { username: string }) => {
    try {
      const regex = new RegExp(`^${data.username}$`, "i");
      const users = await this.userService.aggregateByPipeline([
        {
          $match: {
            $or: [{ username: regex }, { signAddress: data.signAddress }],
          },
        },
      ]);

      const user = users.length > 0 ? users[0] : null;

      if (user) {
        throw new CustomError(
          11000,
          this.localizations.ERRORS.USER.USER_ALREADY_EXIST
        );
      }

      let newUser: Partial<IUserModel>;

      try {
        // @TO-DO: add wallet for testnet
        // if (!IS_MAINNET) {
        // data.wallet["acme"] = 1000;
        // }

        if (data.password) {
          data.password = await bcrypt.hash(data.password, 10);
        }

        data.role = [ROLE.MEMBER];

        newUser = await this.userService.updateOrInsert(
          { username: data.username },
          data
        );
      } catch (error) {
        if (error.code == 11000) {
          throw new CustomError(
            409,
            this.localizations.ERRORS.USER.USER_ALREADY_EXIST
          );
        }

        throw new Error(this.localizations.ERRORS.USER.USER_NOT_CREATED);
      }

      const authParams = this.service.generate({
        userId: newUser._id,
        role: newUser.role?.join(","),
        status: newUser.status,
        signAddress: newUser.signAddress,
      });

      await this.service.updateOrInsert({ userId: newUser._id }, {
        userId: newUser._id,
        refreshToken: authParams.refreshToken,
      } as IAuthModel);

      // @ts-ignore
      delete newUser.password;
      return {
        status: 201,
        payload: {
          auth: authParams,
          user: newUser,
        },
      };
    } catch (error) {
      if (error.status === 11000) {
        throw new CustomError(
          409,
          this.localizations.ERRORS.USER.USER_ALREADY_EXIST
        );
      }
      
      throw new Error(this.localizations.ERRORS.OTHER.SOMETHING_WENT_WRONG);
    }
  };

  // username signIn
  signIn = async (
    { username, password, signAddress, signedSig }: TSignInPayload,
    ipAddress: string
  ) => {
    const regex = new RegExp(`^${username}$`, "i");
    const foundUser = await this.userService.getItem({
      username: regex,
    });

    if (!foundUser) {
      throw new Error(
        this.localizations.ERRORS.USER.USERNAME_OR_PASSWORD_INVALID
      );
    }

    const {
      password: userPassword,
      signAddress: userSignAddress,
      _id: _userId,
    } = foundUser;

    const passwordInvalid: boolean = await bcrypt.compare(
      password,
      userPassword
    );

    if (!passwordInvalid) {
      throw new Error(
        this.localizations.ERRORS.USER.USERNAME_OR_PASSWORD_INVALID
      );
    }

    if (userSignAddress && userSignAddress !== signAddress) {
      throw new Error(
        this.localizations.ERRORS.USER.SIGN_WALLETADDRESS_INCORRECT
      );
    }

    const frontendUrl = new URL(FRONTEND_URL);
    const currentDate = new Date();
    currentDate.setMilliseconds(0);
    currentDate.setSeconds(0);
    currentDate.setMinutes(0);
    const issuedAt = currentDate.toISOString();

    const siweMessage = new SiweMessage({
      domain: frontendUrl.host,
      address: signAddress,
      statement: "Sign in to ACME Bet",
      uri: frontendUrl.origin,
      version: "1",
      chainId: sepolia?.id,
      nonce: signAddress,
      issuedAt,
    });
    const verifyResult = await siweMessage.verify({
      signature: signedSig || "",
      domain: frontendUrl.host,
    });

    if (!verifyResult.success) {
      throw new Error(this.localizations.ERRORS.USER.SIGN_WALLETINFO_INCORRECT);
    }

    const auth = await this.setAuth(foundUser, ipAddress);
    let paymentInformation;
    delete foundUser.password;
    return {
      status: 200,
      payload: {
        auth,
        user: foundUser,
        paymentInformation,
      },
    };
  };

  // update token
  updateToken = async (
    { deviceId, platform },
    refreshToken: { refreshToken: string }
  ) => {
    const authParams = await this.service.getItem(refreshToken, {
      _id: 0,
      userId: 1,
      deviceId: 1,
      platform: 1,
    });

    if (!authParams) {
      throw new CustomError(
        404,
        this.localizations.ERRORS.OTHER.REFRESH_TOKEN_INVALID
      );
    }

    const decodeToken = <UserJwtPayload>(
      jwt.verify(refreshToken.refreshToken, REFRESH_TOKEN_SECRET)
    );

    if (deviceId !== decodeToken?.deviceId) {
      throw new CustomError(403, this.localizations.ERRORS.OTHER.FORBIDDEN);
    }

    const user = await this.userService.getItemById(authParams.userId, {
      password: 0,
    });

    const newAuthParams = this.service.generate({
      userId: user._id,
      role: user?.role?.join(","),
      status: user.status,
      deviceId: deviceId,
      platform: platform,
      signAddress: user.signAddress,
    });

    await this.service.create({
      deviceId: deviceId,
      platform: platform,
      userId: user._id,
      refreshToken: authParams.refreshToken,
    } as IAuthModel);

    return {
      status: 201,
      payload: {
        auth: newAuthParams,
        user,
      },
    };
  };

  logout = async ({ deviceId }, info) => {
    if (deviceId !== info.deviceId) {
      throw new CustomError(401, this.localizations.ERRORS.OTHER.UNAUTHORIZED);
    }

    await this.service.delete({
      deviceId,
      userId: info.userId,
      platform: info.platform,
    });

    return { message: "Success" };
  };

  setAuth = async (user: IUserModel, ipAddress?: string) => {
    const auth = this.service.generate({
      userId: user._id,
      role: user?.role?.join(","),
      status: user.status,
      signAddress: user.signAddress,
    });
    await this.service.updateOrCreate(
      {
        userId: user._id,
      },
      auth.refreshToken,
      ipAddress
    );

    return auth;
  };

  resetPassword = async (data) => {
    const user = await this.userService.getItemById(data.userId);

    if (!user) {
      throw new CustomError(404, this.localizations.ERRORS.USER.NOT_EXIST);
    }

    const { oldPassword, newPassword } = data;
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordValid) {
      throw new CustomError(
        401,
        this.localizations.ERRORS.USER.OLD_PASSWORD_INVALID
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userService.update(user._id, { password: hashedPassword });

    return {
      status: 200,
      message: "Password updated successfully",
    };
  };
}
