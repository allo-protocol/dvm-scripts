# Steps to Create a Pool:

## 1. Pool Operator Profile Creation:

The pool operator initiates the process by creating a registry profile. (see [README/Scripts/Create Profile](README.md#1-create-profile))

## 2. Strategy Deployment:

A strategy needs to be deployed. This can be done by anyone. (see [README/Scripts/Deploy the strategy](README.md#2-deploy-the-strategy))

## 3. Superfluid Integration:

Superfluid needs to allow the strategy to create super apps on Superfluid.

## 4. Decoded Pool Initialization Parameters:

Initialization parameters need to be defined: `bool useRegistryAnchor`, `bool metadataRequired`, `address passportDecoder`, `address superfluidHost`, `address allocationSuperToken`, `uint64 registrationStartTime`, `uint64 registrationEndTime`, `uint64 allocationStartTime`, `uint64 allocationEndTime`, `uint256 minPassportScore`, and `uint256 initialSuperAppBalance`

## 5. Pool Creation Parameter (Allo Contract):

The pool operator defines pool parameters used to call `createPoolWithCustomStrategy` function on the Allo contract.
Parameters include:
`bytes32 _profileId`: created in the first step
`address _strategy`: created in the second step
`bytes memory _initStrategyData`: encoded initialize parameters, see step 4
`address _token`: Pool Token (matching token)
`uint256 _amount`: 0 - match amount, not needed at this point
`Metadata memory _metadata`: consider uploading to IPFS for additional details.
`address[] memory _managers`: Pool Manager Address Array

## 6. Allo Contract Invocation:

The pool operator calls the `createPoolWithCustomStrategy` function on the Allo contract (0x1133eA7Af70876e64665ecD07C0A0476d09465a1) to create the pool.
```
   createPoolWithCustomStrategy(
        bytes32 _profileId,
        address _strategy,
        bytes memory _initStrategyData,
        address _token,
        uint256 _amount,
        Metadata memory _metadata,
        address[] memory _managers
    ) external payable returns (uint256 poolId); 
```

This can be done by a script, see: [README/Scripts/Create a pool](README.md#3-create-a-pool)

## 7. Pool Funding:

Anyone can fund the pool with the allowed super token (_token) to pre-fund the recipients super apps with the `initialSuperAppBalance`. This can be done by a simple token transfer to the strategy.
