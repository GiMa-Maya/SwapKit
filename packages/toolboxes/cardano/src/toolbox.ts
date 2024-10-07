import { mnemonicToSeedSync } from "@scure/bip39";
import { Address, TransactionBuilder, TransactionOutputBuilder, Value } from "@emurgo/cardano-serialization-lib-nodejs";
import { KeyPair, derivePublicKey, derivePrivateKey, signTransaction } from "@cardano-js/sdk";
import {
  AssetValue,
  Chain,
  DerivationPath,
  RPCUrl,
  SwapKitError,
  SwapKitNumber,
  type WalletTxParams,
} from "@swapkit/helpers";

export function validateAddress(address: string) {
  try {
    return Address.is_valid(address);
  } catch (_) {
    return false;
  }
}

function createKeysForPath({
  phrase,
  derivationPath = DerivationPath.ADA,
}: {
  phrase: string;
  derivationPath?: string;
}) {
  const seed = mnemonicToSeedSync(phrase);
  const privateKey = derivePrivateKey(seed, derivationPath);
  const publicKey = derivePublicKey(privateKey);

  return new KeyPair(privateKey, publicKey);
}

function getAddressFromKeys(keypair: KeyPair) {
  const pubKeyHash = keypair.publicKey().to_bech32();
  return Address.from_public_key(pubKeyHash).to_bech32();
}

async function getTokenBalances({
  walletAddress,
}: {
  walletAddress: string;
}) {
  // Fetching UTXOs for the wallet address
  const utxos = await fetchUTXOs(walletAddress);

  const tokenBalances: AssetValue[] = [];
  for (const utxo of utxos) {
    const output = utxo.output();
    const amount = output.amount().coin().to_str();
    const assets = output.multiasset();

    // Fetching the asset balances if present
    if (assets) {
      for (let i = 0; i < assets.keys().len(); i++) {
        const policyId = assets.keys().get(i);
        const assetName = assets.get(policyId).get(0).name().to_str();
        const assetAmount = assets.get(policyId).get(0).amount().to_str();

        tokenBalances.push(
          new AssetValue({
            value: SwapKitNumber.from(assetAmount),
            decimal: 6, // assuming a default decimal value for ADA or tokens
            identifier: `${Chain.Cardano}.${assetName}-${walletAddress}`,
          }),
        );
      }
    }
  }

  return tokenBalances;
}

function getBalance() {
  return async (address: string) => {
    const utxos = await fetchUTXOs(address); // Cardano UTXO model

    // Summing up ADA balance from UTXOs
    const adaBalance = utxos.reduce(
      (acc, utxo) => acc + BigInt(utxo.output().amount().coin().to_str()),
      BigInt(0),
    );

    const tokenBalances = await getTokenBalances({ walletAddress: address });

    return [AssetValue.from({ chain: Chain.Cardano, value: adaBalance }), ...tokenBalances];
  };
}

async function createCardanoTransaction({
  recipient,
  fromKeypair,
  amount,
}: {
  recipient: string;
  fromKeypair: KeyPair;
  amount: number;
}) {
  const txBuilder = new TransactionBuilder();

  const recipientAddress = Address.from_bech32(recipient);

  const transactionOutput = TransactionOutputBuilder.new()
    .with_address(recipientAddress)
    .with_value(Value.new(BigInt(amount)))
    .build();

  txBuilder.add_output(transactionOutput);

  const utxos = await fetchUTXOs(getAddressFromKeys(fromKeypair));
  utxos.forEach((utxo) => txBuilder.add_input(utxo.input(), utxo.output()));

  const txBody = txBuilder.build();

  const signedTx = signTransaction(txBody, fromKeypair);

  return signedTx;
}

function transfer() {
  return async ({
    recipient,
    assetValue,
    fromKeypair,
  }: WalletTxParams & {
    assetValue: AssetValue;
    fromKeypair: KeyPair;
  }) => {
    if (!validateAddress(recipient)) {
      throw new SwapKitError("core_transaction_invalid_recipient_address");
    }

    const transaction = await createCardanoTransaction({
      recipient,
      amount: assetValue.getValue("number"),
      fromKeypair,
    });

    const result = await sendTransaction(transaction);

    if (!result) {
      throw new SwapKitError("core_transaction_failed");
    }

    return result;
  };
}

export const ADAToolbox = ({ rpcUrl = RPCUrl.Cardano }: { rpcUrl?: string } = {}) => {
  const connection = rpcUrl; // Cardano's network connection setup (could use blockfrost or direct node URL)

  return {
    connection,
    createKeysForPath,
    getAddressFromKeys,
    getBalance: getBalance(),
    transfer: transfer(),
    validateAddress,
  };
};

// Helper function to fetch UTXOs from the Cardano blockchain
async function fetchUTXOs(walletAddress: string) {
  // You would use Cardano node/blockfrost or other Cardano API services to fetch UTXOs
  // Here is just a placeholder
  return [];
}

// Helper function to send a signed transaction
async function sendTransaction(signedTransaction: string) {
  // Use your Cardano API service to send the transaction
  // Placeholder for the actual implementation
  return {};
}
