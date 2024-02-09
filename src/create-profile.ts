import * as dotenv from "dotenv";
import { ethers } from "ethers";
import registry from "../abi/Registry.json";
import readline from "readline";

dotenv.config();

// ================== Config ==================
const profile = {
  nonce: 1000040002,
  name: "Test Profile",
  metadata: [1, "bafkreia45cpoutbvd6vdoffz724bpydyjgc3ercz674i7ivixelgzf4vpy"], // 0 = NO PROTOCOL, 1 = IPFS
  members: [],
};
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
  const { nonce, name, metadata, members } = profile;

  console.log("Creating profile with:");
  console.log("\tOwner:", owner);
  console.log("\tNonce:", nonce);
  console.log("\tName:", name);
  console.log("\tMetadata:", metadata);
  console.log("\tMembers:", members);
  console.log("");

  rl.question(
    `Do you want to proceed with address ${signer.address}? (y/n): `,
    async (answer) => {
      if (answer.toLowerCase() === "y") {
        const staticCallResult =
          await registryContract.callStatic.createProfile(
            nonce,
            name,
            metadata,
            owner,
            members,
          );

        console.log("Create Profile:", staticCallResult.toString());

        const createTx = await registryContract.createProfile(
          nonce,
          name,
          metadata,
          owner,
          members,
        );

        console.log("Waiting for confirmation...");

        await createTx.wait();

        console.log(
          `\x1b[32mProfile successfully created: ${staticCallResult.toString()}\x1b[0m`,
        );

        console.log("✅ Created.");
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
