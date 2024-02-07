import * as dotenv from "dotenv";
import readline from "readline";
import {
  Allo,
  CreatePoolArgs,
  DonationVotingMerkleDistributionDirectTransferStrategyAbi,
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
import { decodeEventFromReceipt } from "./utils";

dotenv.config();

const now = Math.floor(new Date().getTime() / 1000);
const minutes = (n: number) => n * 60;

const regStartDateInSeconds = now + minutes(30);
const regEndDateInSeconds = now + minutes(60);
const alloStartDateInSeconds = now + minutes(90);
const alloEndDateInSeconds = now + minutes(120);

// ================= Config ==================

const chainId = Number(process.env.CHAIN_ID);
const rpc = process.env.RPC_URL as string;

const strategy = new DonationVotingMerkleDistributionStrategy({
  chain: chainId,
  rpc,
});

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
    process.env.SIGNER_PRIVATE_KEY as `0x${string}`
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

  console.log("Creating pool with:");

  console.log("\tUseRegistryAnchor:", initData.useRegistryAnchor);
  console.log("\tMetadataRequired:", initData.metadataRequired);
  console.log("\tRegistrationStartTime:", initData.registrationStartTime);
  console.log("\tRegistrationEndTime:", initData.registrationEndTime);
  console.log("\tAllocationStartTime:", initData.allocationStartTime);
  console.log("\tAllocationEndTime:", initData.allocationEndTime);
  console.log("");
  // console.log("\tProfile ID:", poolData.profileId);
  // console.log("\tToken:", poolData.token);
  // console.log("\tMetadata:", poolData.metadata);
  // console.log("\tManagers:", poolData.managers);
  console.log("");

  rl.question(
    `Do you want to proceed with address ${account.address}? (y/n): `,
    async (answer) => {
      if (answer.toLowerCase() === "y") {
        const allo = new Allo({
          chain: chainId,
          rpc,
        });

        // const deployParams = strategy.getDeployParams("Direct");
        // const hash = await walletClient.deployContract({
        //   abi: deployParams.abi as unknown as Abi,
        //   account,
        //   bytecode: deployParams.bytecode,
        // });
        // const receipt = await client.waitForTransactionReceipt({ hash });
        // console.log("Deployed strategy at:", receipt.contractAddress);

        console.log("Creating pool...");

        const initializeData = await strategy.getInitializeData(initData);

        const createPoolArgs: CreatePoolArgs = {
          profileId:
            "0x09132b33efb9c64286494976c25a806163606e96e52813f29266ef3597c4ce86", // created using create-profile.ts
          strategy: "0xD13ec67938B5E9Cb05A05D8e160daF02Ed5ea9C9",
          initStrategyData: initializeData,
          token: NATIVE, // pool token (match token)
          amount: BigInt(1e0) as bigint, // match amount
          metadata: {
            protocol: BigInt(1), // 0 = NONE, 1 = IPFS
            pointer:
              "bafkreia45cpoutbvd6vdoffz724bpydyjgc3ercz674i7ivixelgzf4vpy", // IPFS CID
          },
          managers: ["0x8C180840fcBb90CE8464B4eCd12ab0f840c6647C"],
        };

        console.log("Create Pool Args:", createPoolArgs);

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

        const poolCreatedEvent = decodeEventFromReceipt({
          abi: DonationVotingMerkleDistributionDirectTransferStrategyAbi as Abi,
          receipt: poolReceipt,
          event: "PoolCreated",
        });

        console.log("Pool created with");
        console.log(poolCreatedEvent);
      } else {
        console.log("Exiting script. No further action taken.");
      }

      rl.close();
    }
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
