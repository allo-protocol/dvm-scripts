import * as dotenv from "dotenv";
import readline from "readline";
import {
  Allo,
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
const now = Math.floor(Date.now() / 1000);
const minutes = (n: number) => n * 60;

// ================= Config ==================

const chainId = Number(process.env.CHAIN_ID);
const rpc = process.env.RPC_URL as string;

const initData: dv.InitializeData = {
  useRegistryAnchor: true,
  metadataRequired: true,
  registrationStartTime: BigInt(now + minutes(50)), // in seconds, must be in future
  registrationEndTime: BigInt(now + minutes(220)), // in seconds, must be after registrationStartTime
  allocationStartTime: BigInt(now + minutes(50)), // in seconds, must be after registrationStartTime
  allocationEndTime: BigInt(now + minutes(225)), // in seconds, must be after allocationStartTime
  allowedTokens: [ZERO_ADDRESS], // allow all tokens
};

const poolData = {
  profileId:
    "0xbc52a82d1d307c85455c40fd2761d13a45f960cc2935a55fd8986cf710687920", // created using create-profile.ts
  token: NATIVE, // pool token (match token)
  amount: BigInt(0), // match amount
  metadata: {
    protocol: BigInt(1), // 0 = NONE, 1 = IPFS
    pointer: "bafkreia45cpoutbvd6vdoffz724bpydyjgc3ercz674i7ivixelgzf4vpy", // IPFS CID
  },
  managers: [],
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

  console.log("Creating pool with:");

  console.log("\tUseRegistryAnchor:", initData.useRegistryAnchor);
  console.log("\tMetadataRequired:", initData.metadataRequired);
  console.log("\tRegistrationStartTime:", initData.registrationStartTime);
  console.log("\tRegistrationEndTime:", initData.registrationEndTime);
  console.log("\tAllocationStartTime:", initData.allocationStartTime);
  console.log("\tAllocationEndTime:", initData.allocationEndTime);
  console.log("");
  console.log("\tProfile ID:", poolData.profileId);
  console.log("\tToken:", poolData.token);
  console.log("\tMetadata:", poolData.metadata);
  console.log("\tManagers:", poolData.managers);
  console.log("");

  rl.question(
    `Do you want to proceed with address ${account.address}? (y/n): `,
    async (answer) => {
      if (answer.toLowerCase() === "y") {
        const allo = new Allo({
          chain: chainId,
          rpc,
        });

        const strategy = new DonationVotingMerkleDistributionStrategy({
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

        const poolTxData = allo.createPool({
          profileId: poolData.profileId,
          strategy: "0xD13ec67938B5E9Cb05A05D8e160daF02Ed5ea9C9",
          initStrategyData: initializeData,
          token: poolData.token,
          amount: poolData.amount,
          metadata: poolData.metadata,
          managers: poolData.managers,
        });

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
    },
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
