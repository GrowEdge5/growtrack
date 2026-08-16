export class GrowtrackError extends Error {
  public constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class UnsupportedChainError extends GrowtrackError {
  public constructor(chain: string) {
    super(`Chain '${chain}' is not supported`, "UNSUPPORTED_CHAIN", 400);
  }
}

export class InvalidWalletAddressError extends GrowtrackError {
  public constructor(chain: string) {
    super(`The wallet address is invalid for chain '${chain}'`, "INVALID_WALLET_ADDRESS", 400);
  }
}

export class WalletNotFoundError extends GrowtrackError {
  public constructor(chain: string, address: string) {
    super(`No wallet snapshot exists for ${chain}:${address}`, "WALLET_NOT_FOUND", 404);
  }
}
