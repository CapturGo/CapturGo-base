import { ethers } from 'ethers';
import { supabase } from './supabase';
import BaseTokenABI from '../artifacts/contracts/BaseToken.sol/BaseToken.json';

const CONTRACT_ADDRESS = '0xf12AD4AC08a58D751F323eDf552F6223F17dBCF5';
const PROVIDER_URL = 'https://sepolia.base.org';
const OWNER_PRIVATE_KEY = '3b2346155e67745f06d15820631dc5dda9a099f8d9b471d5f4ed45f49b16b201'; // Replace with secure storage in production

export async function mintTokensToUser(userAddress: string, amount: string) {
  const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
  const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, BaseTokenABI.abi, wallet);
  const tx = await contract.mint(userAddress, ethers.utils.parseUnits(amount, 18));
  await tx.wait();
  return tx.hash;
}

export async function resetUserBalance(userId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ capt_balance: 0 })
    .eq('id', userId);
  if (error) throw error;
}
