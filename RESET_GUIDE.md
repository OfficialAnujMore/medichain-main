# Reset Guide - Starting from Scratch

This guide will help you reset all data and start the application from scratch.

## Quick Reset (Database Only)

To reset just the database (MySQL):

```bash
cd my-app-backend
npm run reset-db
```

Or directly:

```bash
node database/reset-database.js
```

This will:
- ✅ Drop the existing database
- ✅ Create a fresh database
- ✅ Recreate all tables with the schema
- ⚠️ **Note:** This does NOT reset blockchain data

## Complete Reset (Database + Blockchain)

To reset everything including blockchain data:

### Step 1: Stop All Running Services

Stop your backend server (Ctrl+C) and frontend if running.

### Step 2: Reset the Database

```bash
cd my-app-backend
npm run reset-db
```

### Step 3: Reset Ganache Blockchain

1. **Stop Ganache** (if running)
2. **Restart Ganache** - This creates a fresh blockchain with new accounts
3. **Note your new account addresses** from Ganache

### Step 4: Redeploy Smart Contracts

```bash
# From the project root
truffle migrate --reset
```

This will:
- Drop existing contracts
- Deploy fresh contracts
- Update contract addresses in `build/contracts/` and `my-app-backend/contract.json`

### Step 5: Update Contract Address (if needed)

If the contract address changed, make sure `my-app-backend/contract.json` has the correct address for network 1337.

### Step 6: Restart Services

1. **Start Backend:**
   ```bash
   cd my-app-backend
   npm start
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm start
   ```

## What Gets Reset

### ✅ Database (MySQL)
- All user accounts
- All user data
- All tables are recreated fresh

### ✅ Blockchain (Ganache)
- All smart contract state
- All registered doctors
- All registered insurance companies
- All medical records (NFTs)
- All verification statuses

### ⚠️ What's NOT Reset
- Your `.env` configuration files
- Your code changes
- Your Ganache account addresses (but balances reset)

## Testing After Reset

1. **Register a new patient:**
   - Go to the registration page
   - Create a new patient account
   - Login with the new credentials

2. **Register a doctor:**
   - Make sure MetaMask is connected to Ganache
   - Register a doctor account
   - The doctor will be registered on the blockchain

3. **Register an insurance company:**
   - Connect MetaMask
   - Register an insurance company
   - It will be registered on the blockchain

4. **Upload a medical record:**
   - Login as patient
   - Upload a medical record to a doctor
   - The record will be minted as an NFT

## Troubleshooting

### Database Reset Fails
- Check your `.env` file has correct MySQL credentials
- Make sure MySQL server is running
- Check you have permissions to drop/create databases

### Blockchain Reset Issues
- Make sure Ganache is running on port 7545
- Check MetaMask is connected to the correct network (Chain ID: 1337)
- Verify contract deployment was successful
- Check `my-app-backend/contract.json` has the correct network ID and address

### Contract Address Mismatch
If you see errors about contract not found:
1. Check `truffle migrate --reset` output for the new contract address
2. Update `my-app-backend/contract.json` with the new address
3. Restart the backend server

## Quick Commands Reference

```bash
# Reset database only
cd my-app-backend && npm run reset-db

# Reset blockchain (stop Ganache, restart, then):
truffle migrate --reset

# Full reset sequence
cd my-app-backend && npm run reset-db
# Then restart Ganache and run:
truffle migrate --reset
```

