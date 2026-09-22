import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const net = await ethers.provider.getNetwork();

  console.log("------------------------------------------------------");
  console.log("Deploying Decentralized Identity System");
  console.log("Network:", net.name, `(Chain ID: ${net.chainId})`);
  console.log("Deployer account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("------------------------------------------------------");

  // 1. Deploy IdentityRegistry
  console.log("1. Deploying IdentityRegistry...");
  const IdentityRegistryFactory = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistryFactory.deploy();
  await identityRegistry.waitForDeployment();
  const identityRegistryAddress = await identityRegistry.getAddress();
  console.log(`✓ IdentityRegistry deployed to: ${identityRegistryAddress}`);

  // 2. Deploy IssuerRegistry
  console.log("\n2. Deploying IssuerRegistry...");
  const IssuerRegistryFactory = await ethers.getContractFactory("IssuerRegistry");
  const issuerRegistry = await IssuerRegistryFactory.deploy(deployer.address);
  await issuerRegistry.waitForDeployment();
  const issuerRegistryAddress = await issuerRegistry.getAddress();
  console.log(`✓ IssuerRegistry deployed to: ${issuerRegistryAddress}`);

  // 3. Deploy ClaimStore
  console.log("\n3. Deploying ClaimStore...");
  const ClaimStoreFactory = await ethers.getContractFactory("ClaimStore");
  const claimStore = await ClaimStoreFactory.deploy(issuerRegistryAddress, identityRegistryAddress);
  await claimStore.waitForDeployment();
  const claimStoreAddress = await claimStore.getAddress();
  console.log(`✓ ClaimStore deployed to: ${claimStoreAddress}`);

  // 4. Deploy RecoveryModule
  console.log("\n4. Deploying RecoveryModule...");
  const RecoveryModuleFactory = await ethers.getContractFactory("RecoveryModule");
  const recoveryModule = await RecoveryModuleFactory.deploy();
  await recoveryModule.waitForDeployment();
  const recoveryModuleAddress = await recoveryModule.getAddress();
  console.log(`✓ RecoveryModule deployed to: ${recoveryModuleAddress}`);

  // 5. Standard Claim Types Definition
  const CLAIM_KYC_VERIFIED = ethers.keccak256(ethers.toUtf8Bytes("KYC_VERIFIED"));
  const CLAIM_OVER_18 = ethers.keccak256(ethers.toUtf8Bytes("OVER_18"));
  const CLAIM_RESIDENCY_ACCREDITED = ethers.keccak256(ethers.toUtf8Bytes("RESIDENCY_ACCREDITED"));

  console.log("\nStandard Claim Types Registered:");
  console.log(`- KYC_VERIFIED:          ${CLAIM_KYC_VERIFIED}`);
  console.log(`- OVER_18:               ${CLAIM_OVER_18}`);
  console.log(`- RESIDENCY_ACCREDITED:  ${CLAIM_RESIDENCY_ACCREDITED}`);

  // 6. Deploy GatedDeFiService (Demo Verifier Service)
  console.log("\n5. Deploying GatedDeFiService (Consumer / Verifier DApp)...");
  const GatedDeFiFactory = await ethers.getContractFactory("GatedDeFiService");
  const gatedDeFi = await GatedDeFiFactory.deploy(claimStoreAddress, CLAIM_KYC_VERIFIED);
  await gatedDeFi.waitForDeployment();
  const gatedDeFiAddress = await gatedDeFi.getAddress();
  console.log(`✓ GatedDeFiService deployed to: ${gatedDeFiAddress}`);

  // 7. Load ABIs and Export to Frontend
  console.log("\nExporting contract artifacts to frontend...");
  const artifactsDir = path.join(__dirname, "../artifacts/contracts");

  function getAbi(contractPath: string, contractName: string) {
    const fullPath = path.join(artifactsDir, contractPath, `${contractName}.json`);
    const fileContent = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    return fileContent.abi;
  }

  const deploymentData = {
    network: {
      name: net.name,
      chainId: Number(net.chainId),
    },
    claimTypes: {
      KYC_VERIFIED: CLAIM_KYC_VERIFIED,
      OVER_18: CLAIM_OVER_18,
      RESIDENCY_ACCREDITED: CLAIM_RESIDENCY_ACCREDITED,
    },
    contracts: {
      IdentityRegistry: {
        address: identityRegistryAddress,
        abi: getAbi("IdentityRegistry.sol", "IdentityRegistry"),
      },
      IssuerRegistry: {
        address: issuerRegistryAddress,
        abi: getAbi("IssuerRegistry.sol", "IssuerRegistry"),
      },
      ClaimStore: {
        address: claimStoreAddress,
        abi: getAbi("ClaimStore.sol", "ClaimStore"),
      },
      RecoveryModule: {
        address: recoveryModuleAddress,
        abi: getAbi("RecoveryModule.sol", "RecoveryModule"),
      },
      GatedDeFiService: {
        address: gatedDeFiAddress,
        abi: getAbi("examples/GatedDeFiService.sol", "GatedDeFiService"),
      },
    },
  };

  const frontendContractsDir = path.join(__dirname, "../frontend/src/contracts");
  if (!fs.existsSync(frontendContractsDir)) {
    fs.mkdirSync(frontendContractsDir, { recursive: true });
  }

  const frontendFilePath = path.join(frontendContractsDir, "deployedContracts.json");
  const rootFilePath = path.join(__dirname, "../deployedContracts.json");

  fs.writeFileSync(frontendFilePath, JSON.stringify(deploymentData, null, 2));
  fs.writeFileSync(rootFilePath, JSON.stringify(deploymentData, null, 2));

  console.log(`✓ Deployment data successfully written to:\n  - ${frontendFilePath}\n  - ${rootFilePath}`);
  console.log("\nDeployment complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

