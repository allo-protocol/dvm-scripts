import * as dotenv from "dotenv";
import { ethers } from "ethers";
import registry from "../abi/Registry.json";
import readline from "readline";
import {
  DonationVotingMerkleDistributionStrategy,
  Registry,
  RegistryAbi,
} from "@allo-team/allo-v2-sdk";
import { privateKeyToAccount } from "viem/accounts";
import {
  createPublicClient,
  http,
  createWalletClient,
  defineChain,
  Abi,
} from "viem";
import { decodeEventFromReceipt } from "./utils";

dotenv.config();

const randomNonce = Math.floor(Math.random() * 100000000 - 100000) + 100000;
const chainId = Number(process.env.CHAIN_ID);
const rpc = process.env.RPC_URL as string;
const chain = defineChain({
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

// ================== Config ==================
const poolId = 7;
const profiles = [
  {
    nonce: randomNonce + 10000000021,
    name: "Test Profile 1",
    metadata: {
      protocol: BigInt(1),
      pointer: "bafkreif3wuuv4wqp4i5tfwlrnyogtujmhnn6jmoihr5yekaydhsaw2x6oy",
    }, // 0 = NO PROTOCOL, 1 = IPFS
    members: [],
  },
  // {
  //   nonce: randomNonce + 10000000022,
  //   name: "Test Profile 2",
  //   metadata: {
  //     protocol: BigInt(1),
  //     pointer: "bafkreiakgpfq3psade5hmcnk3nrls7eame5yma4n6yfh6d3bvqwqke4rry",
  //   }, // 0 = NO PROTOCOL, 1 = IPFS
  //   members: [],
  // },
];
// ================== /Config ==================

const recipients: { recipientId: `0x${string}` | string; accepted: boolean }[] =
  [];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const strategy = new DonationVotingMerkleDistributionStrategy({
  chain: chainId,
  rpc,
  poolId,
});

async function main() {
  // Wait 10 blocks for re-org protection
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

  // const registryContract = new ethers.Contract(
  //   process.env.ALLO_REGISTRY_ADDRESS as string,
  //   registry.abi,
  //   signer
  // );

  const registryInstance = new Registry({
    chain: chainId,
  });

  rl.question(
    `Do you want to proceed with address ${account.address}? (y/n): `,
    async (answer) => {
      if (answer.toLowerCase() === "y") {
        for (let i = 0; i < profiles.length; i++) {
          const { nonce, name, metadata, members } = profiles[i];

          console.log("Creating profile with:", {
            nonce,
            name,
            metadata,
            members,
          });

          const registerData = await registryInstance.createProfile({
            nonce,
            name,
            metadata,
            owner: account.address,
            members,
          });

          const txHash = await walletClient.sendTransaction({
            account,
            to: registerData.to,
            data: registerData.data,
            value: BigInt(registerData.value),
          });

          const txReceipt = await client.waitForTransactionReceipt({
            hash: txHash,
          });

          const profileCreatedEvent: any = decodeEventFromReceipt({
            abi: RegistryAbi as Abi,
            receipt: txReceipt,
            event: "ProfileCreated",
          });

          const profileId = profileCreatedEvent["profileId"];
          const anchor = profileCreatedEvent["anchor"];

          console.log("Profile ID 1", profileId);
          console.log("Anchor 1", anchor);

          // register the recipient
          const registerRecipientData = strategy.getRegisterRecipientData(
            {
              registryAnchor: anchor as `0x${string}`,
              recipientAddress: account.address,
              metadata: {
                protocol: BigInt(1),
                pointer: "bafkreiakgpfq3psade5hmcnk3nrls7eame5yma4n6yfh6d3bvqwqke4rry",
              },
            }
          );

          const registerRecipientTxHash = await walletClient.sendTransaction({
            account,
            to: registerRecipientData.to,
            data: registerRecipientData.data,
            value: BigInt(registerRecipientData.value),
          });

          console.log("Waiting for confirmation...", registerRecipientTxHash);

          const registerRecipientTxReceipt =
            await client.waitForTransactionReceipt({
              hash: registerRecipientTxHash,
            });

          console.log(
            "Register recipient receipt: ",
            registerRecipientTxReceipt
          );

          const recipientRegisteredEvent: any = decodeEventFromReceipt({
            abi: RegistryAbi as Abi,
            receipt: registerRecipientTxReceipt,
            event: "Registered",
          });

          console.log("Register recipient event: ", recipientRegisteredEvent);

          console.log("Profile ID 2", profileId);
          console.log("Anchor 2", anchor);

          recipients.push({
            recipientId: anchor,
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
