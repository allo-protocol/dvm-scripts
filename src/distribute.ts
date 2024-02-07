import { createPublicClient, http, createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { rpc } from "viem/utils";
import { chain } from "./create-pool";
import * as dotenv from "dotenv";
import { ethers } from "ethers";

dotenv.config();

const chainId = Number(process.env.CHAIN_ID);
const rpc = process.env.RPC_URL as string;

async function main() {
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

  // todo: implement the rest of the script
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
