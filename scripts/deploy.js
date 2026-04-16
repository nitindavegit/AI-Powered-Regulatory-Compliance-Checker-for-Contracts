import fs from "node:fs";
import path from "node:path";
import { ethers } from "ethers";
import hre from "hardhat";

const contractEnvKey = "VITE_CONTRACT_ADDRESS";

const updateEnvFile = (filePath, address) => {
  const prefix = `${contractEnvKey}=`;
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";

  if (current.includes(prefix)) {
    const updated = current.replace(new RegExp(`^${contractEnvKey}=.*$`, "m"), `${prefix}${address}`);
    fs.writeFileSync(filePath, updated, "utf8");
    return;
  }

  const separator = current && !current.endsWith("\n") ? "\n" : "";
  fs.writeFileSync(filePath, `${current}${separator}${prefix}${address}\n`, "utf8");
};

async function main() {
  const artifact = await hre.artifacts.readArtifact("ContractRegistry");
  const networkName = hre.network.name;
  const rpcUrl = networkName === "localhost"
    ? "http://127.0.0.1:8545"
    : process.env.SEPOLIA_RPC_URL || process.env.VITE_RPC_URL;

  if (!rpcUrl) {
    throw new Error("Missing RPC URL. Set SEPOLIA_RPC_URL or VITE_RPC_URL before deployment.");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = networkName === "localhost"
    ? await provider.getSigner(0)
    : new ethers.Wallet(process.env.PRIVATE_KEY || "", provider);

  if (networkName !== "localhost" && !process.env.PRIVATE_KEY) {
    throw new Error("Missing PRIVATE_KEY for Sepolia deployment.");
  }

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
  const registry = await factory.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  const network = await provider.getNetwork();

  console.log("ContractRegistry deployed");
  console.log("Network:", network.name, `(${network.chainId})`);
  console.log("Address:", address);

  const rootDir = process.cwd();
  [".env.local"].forEach((file) => updateEnvFile(path.join(rootDir, file), address));

  const deploymentRecord = {
    contractName: "ContractRegistry",
    address,
    chainId: Number(network.chainId),
    networkName: network.name,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(rootDir, "deployment.json"),
    `${JSON.stringify(deploymentRecord, null, 2)}\n`,
    "utf8"
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
