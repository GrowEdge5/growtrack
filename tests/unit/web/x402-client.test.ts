import algosdk from "algosdk";
import { describe, expect, it } from "vitest";

import {
  buildPaymentGroup,
  formatAtomicAmount,
  parseSettlement,
  selectAlgorandAccept,
  type AlgorandPaymentParams
} from "../../../web/lib/x402";
import type { PaymentRequiredEnvelope, PaymentRequirements } from "../../../web/lib/api";

// The browser-side x402 group construction is the highest-risk code in the product: a
// wrong fee, a wrong index or a missing group id produces a payment the facilitator
// rejects, and the failure only shows up after the user has signed. These tests pin
// the group shape against the published AVM "exact" scheme so the mistake cannot be
// made silently.
//
// They run in Node, where `atob`/`btoa` are globals, so the same code the browser runs
// is what is exercised here.

const PAYER = "JJNP4JGSR5ICF5NTMVC4TO7CE4KM2FDL7G4LAEEFIK2KVGL6RTPLPGMTB4";
const PAY_TO = "F232WLNRKX5JDW3PMP6DQDUF4LEXOZE3JDO5O6O6GU7SFQQLMP2HRQDSEA";
const FEE_PAYER = "ZMFK2OI7ZBD2U27ISERZC4S6LKM6WMFJPZQ4MYNJDZ2VNBNMBA67RA22AA";
// Mainnet genesis hash, base64 — the same value the API serves from algod.
const GENESIS_HASH = "wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=";

function params(): AlgorandPaymentParams {
  return {
    network: "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=",
    genesisId: "mainnet-v1.0",
    genesisHash: GENESIS_HASH,
    minFee: 1000,
    suggestedFee: 1000,
    firstValid: 65_000_000,
    lastValid: 65_001_000
  };
}

function accept(overrides: Partial<PaymentRequirements> = {}): PaymentRequirements {
  return {
    scheme: "exact",
    network: "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=",
    asset: "31566704",
    amount: "50000",
    payTo: PAY_TO,
    maxTimeoutSeconds: 300,
    extra: { name: "USDC", decimals: 6, feePayer: FEE_PAYER },
    ...overrides
  };
}

function decode(base64: string): algosdk.Transaction {
  return algosdk.decodeUnsignedTransaction(
    Uint8Array.from(Buffer.from(base64, "base64")) as Uint8Array
  );
}

describe("buildPaymentGroup", () => {
  it("builds a sponsored two-transaction group with the payment at index 1", () => {
    const group = buildPaymentGroup(params(), accept(), PAYER);

    expect(group.includeFeePayer).toBe(true);
    expect(group.paymentIndex).toBe(1);
    expect(group.feePayerBase64).not.toBeNull();

    const sponsor = decode(group.feePayerBase64 as string);
    const payment = decode(group.paymentBase64);

    // The sponsor's transaction: 0 ALGO from the fee payer to itself, carrying a fee
    // pool large enough for both transactions.
    expect(sponsor.sender.toString()).toBe(FEE_PAYER);
    expect(sponsor.payment?.receiver.toString()).toBe(FEE_PAYER);
    expect(Number(sponsor.payment?.amount ?? -1n)).toBe(0);
    expect(sponsor.type).toBe(algosdk.TransactionType.pay);
    expect(Number(sponsor.fee)).toBe(2000);

    // The user's payment: an ASA transfer of the priced amount, fee 0 because the
    // sponsor's pool covers it.
    expect(payment.sender.toString()).toBe(PAYER);
    expect(payment.type).toBe(algosdk.TransactionType.axfer);
    expect(Number(payment.assetTransfer?.assetIndex ?? -1n)).toBe(31_566_704);
    expect(Number(payment.assetTransfer?.amount ?? -1n)).toBe(50_000);
    expect(payment.assetTransfer?.receiver.toString()).toBe(PAY_TO);
    expect(Number(payment.fee)).toBe(0);

    // Both transactions must share one group id, or the atomic group is invalid.
    expect(groupOf(sponsor)).toEqual(groupOf(payment));
    expect(groupOf(sponsor)).not.toBeNull();

    // The parameters that bind the transaction to a chain.
    expect(payment.genesisID).toBe("mainnet-v1.0");
    expect(Buffer.from(payment.genesisHash as Uint8Array).toString("base64")).toBe(GENESIS_HASH);
  });

  it("collapses to a single self-paid transaction when no fee payer is advertised", () => {
    const group = buildPaymentGroup(
      params(),
      accept({ extra: { name: "USDC", decimals: 6 } }),
      PAYER
    );

    expect(group.includeFeePayer).toBe(false);
    expect(group.feePayerBase64).toBeNull();
    // With no sponsor the payment is the only transaction, so it pays its own fee and
    // is the one the facilitator must look at.
    expect(group.paymentIndex).toBe(0);

    const payment = decode(group.paymentBase64);
    expect(Number(payment.fee)).toBe(1000);
    expect(groupOf(payment)).toBeNull();
  });

  it("carries the exact atomic amount and asset from the requirements", () => {
    const group = buildPaymentGroup(
      params(),
      accept({ amount: "1", asset: "10458941" }),
      PAYER
    );
    const payment = decode(group.paymentBase64);

    expect(Number(payment.assetTransfer?.amount ?? -1n)).toBe(1);
    expect(Number(payment.assetTransfer?.assetIndex ?? -1n)).toBe(10_458_941);
  });
});

function groupOf(transaction: algosdk.Transaction): string | null {
  const group = transaction.group;
  return group === undefined ? null : Buffer.from(group).toString("base64");
}

describe("selectAlgorandAccept", () => {
  const envelope = (accepts: PaymentRequirements[]): PaymentRequiredEnvelope => ({
    x402Version: 2,
    accepts
  });

  it("selects the Algorand exact accept", () => {
    const chosen = selectAlgorandAccept(
      envelope([
        {
          ...accept(),
          network: "eip155:1",
          scheme: "exact"
        },
        accept()
      ])
    );

    expect(chosen.network.startsWith("algorand:")).toBe(true);
  });

  it("fails loudly when only unsupported networks are offered", () => {
    expect(() =>
      selectAlgorandAccept(envelope([{ ...accept(), network: "eip155:1" }]))
    ).toThrowError(/cannot pay/i);
  });
});

describe("parseSettlement", () => {
  it("reads the transaction id out of the base64 PAYMENT-RESPONSE header", () => {
    const header = Buffer.from(
      JSON.stringify({
        success: true,
        transaction: "TXID123",
        network: "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=",
        payer: PAYER
      })
    ).toString("base64");

    expect(parseSettlement(header)).toEqual({
      transactionId: "TXID123",
      payer: PAYER,
      network: "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8="
    });
  });

  it("returns null rather than an empty receipt when nothing settled", () => {
    expect(parseSettlement(null)).toBeNull();
    expect(parseSettlement("")).toBeNull();
    expect(parseSettlement(Buffer.from(JSON.stringify({ success: false })).toString("base64"))).toBeNull();
    expect(parseSettlement("not-base64-json")).toBeNull();
  });
});

describe("formatAtomicAmount", () => {
  it("renders atomic units in whole asset units", () => {
    expect(formatAtomicAmount("50000", 6)).toBe("0.05");
    expect(formatAtomicAmount("1000000", 6)).toBe("1");
    expect(formatAtomicAmount("1234567", 6)).toBe("1.234567");
  });

  it("returns the raw value rather than a wrong number when it is not an integer", () => {
    expect(formatAtomicAmount("not-a-number", 6)).toBe("not-a-number");
  });
});
