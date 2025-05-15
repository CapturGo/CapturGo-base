// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BaseToken is ERC20, Ownable {
    constructor(address initialOwner) ERC20("CapturGo Base Token", "CAP") Ownable(initialOwner) {}

    // Mint function: only owner can mint
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
