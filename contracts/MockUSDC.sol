// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockUSDC is ERC20, Ownable {
    uint8 private _decimals;

    constructor() ERC20("USD Coin (Test)", "USDC") Ownable(msg.sender) {
        _decimals = 6;
        // Mint 100,000 USDC to deployer
        _mint(msg.sender, 100_000 * 10 ** 6);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    // Anyone can mint test tokens (it's a testnet)
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    // Faucet: get 1000 USDC
    function faucet() external {
        _mint(msg.sender, 1000 * 10 ** 6);
    }
}
