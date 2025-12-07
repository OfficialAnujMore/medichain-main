import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { Web3 } from 'web3';
// import IdentityVerification from './contracts/getContract';
import contractData from './contract.json';
import AuthPage from './components/AuthPage';
import PatientPortal from './components/PatientPortal';
import DoctorPortal from './components/DoctorPortal';
import InsurancePortal from './components/InsurancePortal';
import AdminPortal from './components/AdminPortal';
import './App.css';

const App = () => {
  const [web3, setWeb3] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(() => {
    // Initialize from localStorage
    return localStorage.getItem('userRole') || null;
  });

  const switchToGanacheNetwork = async () => {
    const chainId = '0x539'; // 1337 in hex
    try {
      // Try to switch to the network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });
      return true;
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          // Add the Ganache network to MetaMask
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId,
                chainName: 'Ganache Local',
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['http://127.0.0.1:7545'],
                blockExplorerUrls: null,
              },
            ],
          });
          return true;
        } catch (addError) {
          console.error('Error adding network:', addError);
          alert('Please manually add Ganache network to MetaMask:\nNetwork Name: Ganache Local\nRPC URL: http://127.0.0.1:7545\nChain ID: 1337\nCurrency Symbol: ETH');
          return false;
        }
      } else {
        console.error('Error switching network:', switchError);
        alert('Please manually switch to Ganache network (Chain ID: 1337) in MetaMask.');
        return false;
      }
    }
  };

  const loadBlockchainData = async () => {
    // Prevent infinite loop - check if we've already attempted a network switch
    const networkSwitchAttempted = sessionStorage.getItem('networkSwitchAttempted');
    
    try {
      let web3Instance;
      if (window.ethereum) {
        web3Instance = new Web3(window.ethereum);
        // Request account access (replaces deprecated enable())
        await window.ethereum.request({ method: 'eth_requestAccounts' });
      } else if (window.web3) {
        web3Instance = new Web3(window.web3.currentProvider);
      } else {
        alert('Non-Ethereum browser detected. Please install MetaMask!');
        setLoading(false);
        return;
      }
      setWeb3(web3Instance);

      const accountsList = await web3Instance.eth.getAccounts();
      setAccounts(accountsList);
      console.log('Connected accounts:', accountsList);

      const networkId = await web3Instance.eth.net.getId();
      console.log('Current network ID:', networkId);
      
      // Check if we're on a supported Ganache network (1337 or 5777)
      const supportedNetworks = ['1337', '5777'];
      const currentNetworkId = networkId.toString();
      
      if (!supportedNetworks.includes(currentNetworkId) && window.ethereum && !networkSwitchAttempted) {
        console.log('Switching to Ganache network (1337 or 5777)...');
        sessionStorage.setItem('networkSwitchAttempted', 'true');
        const switched = await switchToGanacheNetwork();
        if (switched) {
          // Wait a moment for the network to switch, then reload
          setTimeout(() => {
            sessionStorage.removeItem('networkSwitchAttempted');
            window.location.reload();
          }, 1000);
          return;
        } else {
          // If switch failed, clear the flag so user can try again
          sessionStorage.removeItem('networkSwitchAttempted');
        }
      }
      
      // Clear the flag if we're on a supported network
      if (supportedNetworks.includes(currentNetworkId)) {
        sessionStorage.removeItem('networkSwitchAttempted');
      }
      
      // Convert networkId to string for comparison (JSON keys are strings)
      const deployedNetwork = contractData.networks[networkId.toString()];

      if (deployedNetwork) {
        const contractInstance = new web3Instance.eth.Contract(
          contractData.abi,
          deployedNetwork.address,
        );
        setContract(contractInstance);
        console.log('Contract initialized:', contractInstance);
        console.log('Contract address:', deployedNetwork.address);
      } else {
        console.error('Contract not found for network:', networkId);
        console.log('Available networks:', Object.keys(contractData.networks));
        if (!networkSwitchAttempted && window.ethereum) {
          sessionStorage.setItem('networkSwitchAttempted', 'true');
          const switched = await switchToGanacheNetwork();
          if (switched) {
            setTimeout(() => {
              sessionStorage.removeItem('networkSwitchAttempted');
              window.location.reload();
            }, 1000);
            return;
          } else {
            sessionStorage.removeItem('networkSwitchAttempted');
          }
        }
          alert(`Smart contract not deployed to the current network (${networkId}). Please switch to network 1337 or 5777 (Ganache) in MetaMask.`);
      }
    } catch (error) {
      console.error('Error initializing blockchain data:', error);
      sessionStorage.removeItem('networkSwitchAttempted');
      alert(`Error connecting to blockchain: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUserRole(null);
    localStorage.removeItem('userRole');
    alert('You have been logged out.');
  };

  const handleSetUserRole = (role) => {
    setUserRole(role);
    if (role) {
      localStorage.setItem('userRole', role);
    } else {
      localStorage.removeItem('userRole');
    }
  };

  const handleAccountChange = accounts => {
    if (accounts.length === 0) {
      alert('Please connect to MetaMask.');
    } else {
      setAccounts(accounts);
    }
  };

  const handleNetworkChange = () => {
    window.location.reload();
  };

  useEffect(() => {
    loadBlockchainData();

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountChange);
      window.ethereum.on('chainChanged', handleNetworkChange);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountChange);
        window.ethereum.removeListener('chainChanged', handleNetworkChange);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading MediChain...</p>
        <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.5rem' }}>
          Connecting to blockchain
        </p>
      </div>
    );
  }

  if (!web3 || !contract) {
    return (
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <h2>Connection Error</h2>
        <p>
          Error connecting to blockchain. Please ensure MetaMask is connected
          and try again.
        </p>
        <p style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>
          Make sure you're on the correct network (Ganache - Chain ID: 1337 or 5777)
        </p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            userRole ? (
              <Navigate to={`/${userRole}`} replace />
            ) : (
              <AuthPage
                setUserRole={handleSetUserRole}
                contract={contract}
                accounts={accounts}
                web3={web3}
              />
            )
          }
        />
        <Route
          path="/patient"
          element={
            userRole === 'patient' ? (
              <PatientPortal
                contract={contract}
                accounts={accounts}
                web3={web3}
                handleLogout={handleLogout} // Pass logout
              />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/doctor"
          element={
            userRole === 'doctor' ? (
              <DoctorPortal
                contract={contract}
                accounts={accounts}
                web3={web3}
                handleLogout={handleLogout} // Pass logout
              />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/insurance"
          element={
            userRole === 'insurance' ? (
              <InsurancePortal
                contract={contract}
                accounts={accounts}
                web3={web3}
                handleLogout={handleLogout} // Pass logout
              />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/admin"
          element={
            userRole === 'admin' ? (
              <AdminPortal
                contract={contract}
                accounts={accounts}
                web3={web3}
                handleLogout={handleLogout} // Pass logout
              />
            ) : (
              <Navigate to="/" />
            )
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
