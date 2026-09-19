import algosdk from "algosdk";

// Everything a browser needs to construct and sign an Algorand transaction for the
// network this deployment actually charges on.
//
// Why the server hands these out instead of the browser calling algod directly:
// suggested params must come from the SAME network the payment requirements name.
// If the client picked its own endpoint it could build a mainnet transaction
// against requirements priced for testnet and only discover the mismatch at settle
// time, with the user's signature already attached. Serving the params next to the
// CAIP-2 network id makes that silent mismatch unreachable.
export interface AlgorandPaymentParams {
  // CAIP-2 network id, identical to the one in the 402 accept. The client MUST
  // compare this against the accept it is answering before signing anything.
  network: string;
  genesisId: string;
  // Base64 genesis hash — the field that actually binds a transaction to a chain.
  genesisHash: string;
  // Fee floor in microAlgos. One transaction in a group may carry a fee large
  // enough to cover the whole group (fee pooling); the facilitator's sponsored
  // fee-payer transaction is the one that does.
  minFee: number;
  suggestedFee: number;
  firstValid: number;
  lastValid: number;
}

interface Options {
  apiUrl: string;
  timeoutMs: number;
  /** The CAIP-2 network the x402 layer charges on. */
  network: string;
}

export class GetAlgorandPaymentParams {
  private readonly client: algosdk.Algodv2;

  public constructor(private readonly options: Options) {
    // Token is empty for keyless public endpoints; port is unused with a full URL.
    this.client = new algosdk.Algodv2("", options.apiUrl, "");
  }

  public async execute(): Promise<AlgorandPaymentParams> {
    const params = await withTimeout(
      this.client.getTransactionParams().do(),
      this.options.timeoutMs,
      "algod getTransactionParams"
    );

    // algosdk v3 types these as number | bigint; rounds and fees are far below
    // 2^53, so narrowing here is exact rather than lossy.
    const minFee = Number(params.minFee);
    const suggestedFee = Number(params.fee);

    return {
      network: this.options.network,
      genesisId: params.genesisID ?? "",
      genesisHash:
        params.genesisHash === undefined ? "" : Buffer.from(params.genesisHash).toString("base64"),
      minFee: Number.isFinite(minFee) && minFee > 0 ? minFee : 1000,
      suggestedFee: Number.isFinite(suggestedFee) && suggestedFee > 0 ? suggestedFee : 1000,
      firstValid: Number(params.firstValid),
      lastValid: Number(params.lastValid)
    };
  }
}

// Bounds the upstream read: algosdk's .do() has no timeout, so a hung node would
// otherwise stall the request behind it.
async function withTimeout<T>(operation: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
      timeoutMs
    );
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
