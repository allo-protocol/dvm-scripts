import * as dotenv from "dotenv";
import readline from "readline";
import {
  Allo,
  AlloAbi,
  CreatePoolArgs,
  DirectGrantsStrategy,
  NATIVE,
  DirectGrantsStrategyTypes as dg,
} from "@allo-team/allo-v2-sdk";
import {
  Abi,
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { decodeEventFromReceipt } from "../utils";

dotenv.config();

const chainId = Number(process.env.CHAIN_ID);
const rpc = process.env.RPC_URL as string;

const strategy = new DirectGrantsStrategy({
  chain: chainId,
  rpc,
});

// ================= Config ==================

const profileId =
  "0x33522ed4f73f527577cf5da088d4d6d62e301b958d478f416179ec93548b8b1a";
const strategyAddress = "0xaC3f288a7A3efA3D33d9Dd321ad31072915D155d";
const amount = BigInt(0) as bigint;
const poolMetadata = {
  protocol: BigInt(1), // 0 = NONE, 1 = IPFS
  pointer: "QmaHez3wqMadqBy6m8PKNBFAeNPNJhK7nikjfsdV7zeL2d", // IPFS CID
};
const poolToken = NATIVE;
const managers = ["0x8C180840fcBb90CE8464B4eCd12ab0f840c6647C"];

const initParams: dg.InitializeParams = {
  registryGating: true,
  metadataRequired: true,
  grantAmountRequired: true,
};
// ================== /Config ==================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export const chain = defineChain({
  id: chainId,
  name: "Development 1",
  network: "dev1",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: { http: [rpc] },
    public: { http: [rpc] },
  },
  blockExplorers: {
    default: {
      name: "dev1",
      url: "",
    },
  },
});

async function main() {
  const client = createPublicClient({
    chain,
    transport: http(rpc),
  });

  const walletClient = createWalletClient({
    chain,
    transport: http(rpc),
  });

  const account = privateKeyToAccount(
    process.env.SIGNER_PRIVATE_KEY as `0x${string}`,
  );

  rl.question(
    `Do you want to proceed with address ${account.address}? (y/n): `,
    async (answer) => {
      if (answer.toLowerCase() === "y") {
        const allo = new Allo({
          chain: chainId,
          rpc,
        });

        console.log("Creating pool...");

        const initializeData = await strategy.getInitializeData(initParams);

        const createPoolArgs: CreatePoolArgs = {
          profileId: profileId, // created using create-profile.ts
          strategy: strategyAddress,
          initStrategyData: initializeData,
          token: poolToken,
          amount: amount, // match amount
          metadata: poolMetadata,
          managers: managers,
        };

        const poolTxData = allo.createPool(createPoolArgs);

        const poolHash = await walletClient.sendTransaction({
          account,
          to: poolTxData.to,
          data: poolTxData.data,
          value: BigInt(poolTxData.value),
        });

        const poolReceipt = await client.waitForTransactionReceipt({
          hash: poolHash,
        });

        const poolCreatedEvent: any = decodeEventFromReceipt({
          abi: AlloAbi as Abi,
          receipt: poolReceipt,
          event: "PoolCreated",
        });

        console.log("Pool ID", Number(poolCreatedEvent["poolId"]));
        console.log("Strategy", poolCreatedEvent["strategy"]);
      } else {
        console.log("Exiting script. No further action taken.");
      }

      rl.close();
    },
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
