import type { KeyPair, Transaction } from "@cardano-js/sdk";
import { Chain } from "@swapkit/helpers";
import type { ADAToolbox } from "./toolbox";

type CardanoEvent = "connect" | "disconnect" | "accountChanged";

type CardanoRequestMethod =
  | "connect"
  | "disconnect"
  | "signAndSendTransaction"
  | "signTransaction"
  | "signAllTransactions"
  | "signMessage";

interface ConnectOpts {
  onlyIfTrusted: boolean;
}

export { ADAToolbox, validateAddress, createCardanoTransaction } from "./toolbox";

export type CardanoWallets = {
  [Chain.Cardano]: ReturnType<typeof ADAToolbox>;
};

export interface CardanoProvider {
  connect: (opts?: Partial<ConnectOpts>) => Promise<{ publicKey: string }>;
  disconnect: () => Promise<void>;
  getAddress: () => Promise<string>;
  isConnected: boolean | null;
  isYoroi: boolean; // Example wallet, you can extend for other wallets like Nami, etc.
  on: (event: CardanoEvent, handler: (args: any) => void) => void;
  publicKey: string | null;
  request: (method: CardanoRequestMethod, params: any) => Promise<unknown>;
  signMessage: (message: Uint8Array | string) => Promise<any>;
  signAndSendTransaction: (
    transaction: Transaction,
  ) => Promise<{ txHash: string; publicKey: string }>;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
}
