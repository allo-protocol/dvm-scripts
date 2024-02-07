# SQFSuperfluidStrategy Scripts

Strategy can be found [here](https://github.com/allo-protocol/allo-v2/tree/main/contracts/strategies/_poc/sqf-superfluid).

## Installation

1. Clone the repository:

```bash
git clone git@github.com:allo-protocol/sqf-scripts.git
```

2. Install dependencies:

```bash
yarn install
```

3. Create a .env file at the root of the repository and add the following variables:

- `RPC_URL` - Your Infura RPC URL
- `SIGNER_PRIVATE_KEY` - The private key of the pool manager/address that will call contracts
- `ALLO_REGISTRY_ADDRESS` - The address of the Allo Protocol registry
- `ALLO_MAIN_ADDRESS` - The address of the Allo Protocol main contract

## Scripts

1. Create Profile
To create a pool on Allo you need a Registry profile. If you don't have one yet, you can create one using this script.

- Open `src/create-profile.ts`
- Fill out the `profile` config params (lines 8-15)
- save and run:

```shell
yarn create-profile
```

2. Deploy the strategy.

```shell
yarn deploy-strategy
```

3. Create a pool
- Open `src/create-pool.ts`
- Fill out the `initData` and `poolData` config params (lines 8-35)
- save and run:
  
```shell
yarn run create-pool
```
