import * as dotenv from "dotenv";
import { ethers } from "ethers";
import registry from "../abi/Registry.json";
import readline from "readline";
import { Registry, SQFSuperFluidStrategy } from "@allo-team/allo-v2-sdk";
import { createPublicClient, http, createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { chain } from "./create-pool";

dotenv.config();

const randomNonce = Math.floor(Math.random() * 100000000 - 100000) + 100000;

// ================== Config ==================
const poolId = 13;
const profiles = [
  {
    nonce: randomNonce + 10000000021,
    name: "Test Profile 1",
    metadata: [0, "Test Metadata"], // 0 = NO PROTOCOL, 1 = IPFS
    members: [],
  },
  {
    nonce: randomNonce + 10000000022,
    name: "Test Profile 2",
    metadata: [0, "Test Metadata"], // 0 = NO PROTOCOL, 1 = IPFS
    members: [],
  },
  // {
  //   nonce: randomNonce + 10000000023,
  //   name: "Test Profile 3",
  //   metadata: [0, "Test Metadata"], // 0 = NO PROTOCOL, 1 = IPFS
  //   members: [],
  // },
  // {
  //   nonce: randomNonce + 10000000024,
  //   name: "Test Profile 4",
  //   metadata: [0, "Test Metadata"], // 0 = NO PROTOCOL, 1 = IPFS
  //   members: [],
  // },
  // {
  //   nonce: randomNonce + 10000000025,
  //   name: "Test Profile 5",
  //   metadata: [0, "Test Metadata"], // 0 = NO PROTOCOL, 1 = IPFS
  //   members: [],
  // },
];
// ================== /Config ==================

const recipients: { recipientId: `0x${string}` | string; accepted: boolean }[] =
  [];

const chainId = Number(process.env.CHAIN_ID);
const rpc = process.env.RPC_URL as string;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  // Wait 10 blocks for re-org protection
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.RPC_URL as string
  );

  const signer = new ethers.Wallet(
    process.env.SIGNER_PRIVATE_KEY as string,
    provider
  );

  const account = privateKeyToAccount(
    process.env.SIGNER_PRIVATE_KEY as `0x${string}`
  );

  const registryContract = new ethers.Contract(
    process.env.ALLO_REGISTRY_ADDRESS as string,
    registry.abi,
    signer
  );

  const owner = signer.address;

  const registryInstance = new Registry({
    chain: chainId,
  });

  const sqfStrategy = new SQFSuperFluidStrategy({
    chain: chainId,
    poolId: poolId,
  });

  rl.question(
    `Do you want to proceed with address ${signer.address}? (y/n): `,
    async (answer) => {
      if (answer.toLowerCase() === "y") {
        for (let i = 0; i < profiles.length; i++) {
          const { nonce, name, metadata, members } = profiles[i];
          const staticCallResult =
            await registryContract.callStatic.createProfile(
              nonce,
              name,
              metadata,
              owner,
              members
            );

          console.log("Create Profile:", staticCallResult.toString());

          const createTx = await registryContract.createProfile(
            nonce,
            name,
            metadata,
            owner,
            members
          );

          console.log("Waiting for confirmation...");

          await createTx.wait();

          console.log(
            `\x1b[32mProfile successfully created: ${staticCallResult.toString()}\x1b[0m`
          );

          console.log("Creating dummy recipients...");

          const pr = await registryInstance.getProfileById(
            staticCallResult.toString()
          );

          const registerArgs = await sqfStrategy.getRegisterRecipientData({
            registryAnchor: pr.anchor as `0x${string}`,
            recipientAddress: owner as `0x${string}`,
            metadata: {
              protocol: BigInt(0),
              pointer: "dummy data",
            },
          });

          const registerTx = await signer.sendTransaction({
            to: registerArgs.to,
            data: registerArgs.data,
          });

          console.log("Waiting for confirmation...");

          await registerTx.wait();

          console.log("Dummy recipient created: ", pr.anchor);

          recipients.push({
            recipientId: pr.anchor,
            accepted: true,
          });
        }

        console.log("Recipients:");
        console.log(recipients);
        console.log("✅ Created.");
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
