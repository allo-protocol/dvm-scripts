import * as dotenv from "dotenv";
import readline from "readline";
import {
  Allo,
  AlloAbi,
  CreatePoolArgs,
  DonationVotingMerkleDistributionStrategy,
  NATIVE,
  ZERO_ADDRESS,
  DonationVotingMerkleDistributionStrategyTypes as dv,
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

const strategy = new DonationVotingMerkleDistributionStrategy({
  chain: chainId,
  rpc,
});

// ================= Config ==================

const profileId =
  "0x8c5b2a2eb2a9c0066653b8f6de2256728b945561e717c0b0e2e4542b7fdd83d2";
const strategyAddress = "0x2f9920e473E30E54bD9D56F571BcebC2470A37B0";
const amount = BigInt(0) as bigint;
const poolMetadata = {
  protocol: BigInt(1), // 0 = NONE, 1 = IPFS
  pointer: "QmdvUsxQebfrZfGKbQgj6p9FXeVX2qGcaAH9uCqHC3KALP", // IPFS CID
};
const poolToken = NATIVE;
const managers = ["0x8C180840fcBb90CE8464B4eCd12ab0f840c6647C"];

const now = Math.floor(new Date().getTime() / 1000);
const minutes = (n: number) => n * 60;

const regStartDateInSeconds = now + minutes(3);
const regEndDateInSeconds = now + minutes(24 * 7 * 60);
const alloStartDateInSeconds = now + minutes(90);
const alloEndDateInSeconds = now + minutes(24 * 7 * 120);

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

  // Set up initialize data typed from SDK
  const initData: dv.InitializeData = {
    useRegistryAnchor: true,
    metadataRequired: true,
    registrationStartTime: BigInt(regStartDateInSeconds), // in seconds, must be in future
    registrationEndTime: BigInt(regEndDateInSeconds), // in seconds, must be after registrationStartTime
    allocationStartTime: BigInt(alloStartDateInSeconds), // in seconds, must be after registrationStartTime
    allocationEndTime: BigInt(alloEndDateInSeconds), // in seconds, must be after allocationStartTime
    allowedTokens: [ZERO_ADDRESS], // allow all tokens
  };

  console.log("========================");

  console.log("Creating pool with the following parameters:");
  console.log("\tUseRegistryAnchor:", initData.useRegistryAnchor);
  console.log("\tMetadataRequired:", initData.metadataRequired);
  console.log("\tRegistrationStartTime:", initData.registrationStartTime);
  console.log("\tRegistrationEndTime:", initData.registrationEndTime);
  console.log("\tAllocationStartTime:", initData.allocationStartTime);
  console.log("\tAllocationEndTime:", initData.allocationEndTime);

  console.log("========================");

  rl.question(
    `Do you want to proceed with address ${account.address}? (y/n): `,
    async (answer) => {
      if (answer.toLowerCase() === "y") {
        const allo = new Allo({
          chain: chainId,
          rpc,
        });

        console.log("Creating pool...");

        const initializeData = await strategy.getInitializeData(initData);

        const createPoolArgs: CreatePoolArgs = {
          profileId: profileId, // created using create-profile.ts
          strategy: strategyAddress,
          initStrategyData: initializeData,
          token: poolToken,
          amount: amount, // match amount
          metadata: poolMetadata,
          managers: managers,
        };

        console.log("Create Pool Args", createPoolArgs);

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
