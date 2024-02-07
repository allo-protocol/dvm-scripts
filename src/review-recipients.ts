import * as dotenv from "dotenv";
import { ethers } from "ethers";
import registry from "../abi/Registry.json";
import readline from "readline";
import { Registry, SQFSuperFluidStrategy } from "@allo-team/allo-v2-sdk";
import { ReviewRecipientDataSuperfluid } from "@allo-team/allo-v2-sdk/dist/strategies/SuperFluidStrategy/types";
import { Status } from "@allo-team/allo-v2-sdk/dist/types";

dotenv.config();

// ================== Config ==================
const chainId = 11155420;
const poolId = 13;
const strategy = "0xD13ec67938B5E9Cb05A05D8e160daF02Ed5ea9C9";
const profiles = [
  {
    recipientId: "0xEcaa82aa6E2E3d41fECF6eA6D8eEec654e4F0527",
    accepted: true,
  },
  {
    recipientId: "0x2e6ED3429e6eeD7544F740ab6152DD77E832fc9b",
    accepted: true,
  },
];
// ================== /Config ==================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  // Wait 10 blocks for re-org protection
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.RPC_URL as string,
  );

  const signer = new ethers.Wallet(
    process.env.SIGNER_PRIVATE_KEY as string,
    provider,
  );

  const registryContract = new ethers.Contract(
    process.env.ALLO_REGISTRY_ADDRESS as string,
    registry.abi,
    signer,
  );

  const owner = signer.address;

  const registryInstance = new Registry({
    chain: chainId,
  });

  const sqfStrategy = new SQFSuperFluidStrategy({
    chain: chainId,
    poolId: poolId,
    address: strategy,
  });

  rl.question(
    `Do you want to proceed with address ${signer.address}? (y/n): `,
    async (answer) => {
      if (answer.toLowerCase() === "y") {
        const reviewData: ReviewRecipientDataSuperfluid[] = [];

        for (let i = 0; i < profiles.length; i++) {
          const { recipientId, accepted } = profiles[i];

          const data: ReviewRecipientDataSuperfluid = {
            recipientId: recipientId as `0x${string}`,
            recipientStatus: accepted ? Status.Accepted : Status.Rejected,
          };

          reviewData.push(data);
        }
        const reviewArgs = sqfStrategy.getReviewRecipientData(reviewData);

        console.log("Reviewing...");

        const reviewTx = await signer.sendTransaction({
          to: reviewArgs.to,
          data: reviewArgs.data,
        });

        console.log("Waiting for confirmation...");

        await reviewTx.wait();

        console.log("✅ Reviewed.");
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
