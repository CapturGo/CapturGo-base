// scripts/deploy.js
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const BaseToken = await ethers.getContractFactory("BaseToken");
  const token = await BaseToken.deploy(deployer.address); // Pass deployer as initialOwner
  await token.deployed();

  console.log("BaseToken deployed to:", token.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
