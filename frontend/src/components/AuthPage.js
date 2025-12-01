import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './AuthPage.css';

const AuthPage = ({ setUserRole, contract, accounts }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('patient'); // Default role
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async e => {
    e.preventDefault();
    const endpoint = isRegister
      ? 'http://localhost:5001/api/register'
      : 'http://localhost:5001/api/login';

    setLoading(true);

    try {
      const payload = { username, password, role };

      // Include Ethereum address during registration for doctor or insurance
      if (isRegister && (role === 'doctor' || role === 'insurance')) {
        console.log('Accounts:', accounts);

        if (!accounts || accounts.length === 0) {
          alert('No Ethereum account found. Please connect your wallet.');
          setLoading(false);
          return;
        }

        payload.address = accounts[0];
        payload.name = username;
      }

      const response = await axios.post(endpoint, payload);
      console.log('Response:', response.data);

      if (isRegister) {
        if (role === 'doctor' || role === 'insurance') {
          try {
            const methodName =
              role === 'doctor' ? 'registerDoctor' : 'registerInsuranceCompany';

            console.log(
              `Registering ${role} on the blockchain: ${accounts[0]}`,
            );
            let receipt;

            if (role === 'insurance') {
              receipt = await contract.methods[methodName](
                accounts[0],
                username,
              ).send({ from: accounts[0] });
            } else {
              receipt = await contract.methods[methodName](accounts[0]).send({
                from: accounts[0],
              });
            }

            if (receipt.status) {
              console.log(
                `${
                  role.charAt(0).toUpperCase() + role.slice(1)
                } registered on the blockchain successfully.`,
              );
              alert(
                `${
                  role.charAt(0).toUpperCase() + role.slice(1)
                } registration completed successfully.`,
              );
            } else {
              alert(
                `${
                  role.charAt(0).toUpperCase() + role.slice(1)
                } registration failed on the blockchain.`,
              );
            }
          } catch (err) {
            console.error(
              `Blockchain registration failed for ${role}:`,
              err.message,
            );
            alert(
              `${
                role.charAt(0).toUpperCase() + role.slice(1)
              } registration failed on the blockchain.`,
            );
          }
        }

        alert('Registration successful! Please log in with your credentials.');
        setIsRegister(false);
        setUsername('');
        setPassword('');
        return; // Stop further execution for registration
      }

      if (response.data.role) {
        // Login flow
        setUserRole(response.data.role);
        navigate(`/${response.data.role}`); // Redirect to the appropriate role page
      } else {
        alert('Authentication failed!'); // Fallback for unexpected scenarios
      }
    } catch (error) {
      console.error('Error:', error.response?.data || error.message);
      alert('Authentication failed!');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { value: 'patient', label: 'Patient' },
    { value: 'doctor', label: 'Doctor/Hospital' },
    { value: 'insurance', label: 'Insurance Company' },
  ];

  return (
    <div className="auth-container">
      <div className="auth-content">
        <h1>MediChain</h1>
        <p className="auth-subtitle">{isRegister ? 'Create your account' : 'Welcome back'}</p>
        
        <form className="auth-form" onSubmit={handleAuth}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              className="username"
              placeholder="Enter your username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Select Role</label>
            <div className="role-selection">
              {roles.map((roleOption) => (
                <button
                  key={roleOption.value}
                  type="button"
                  className={`role-box ${role === roleOption.value ? 'selected' : ''}`}
                  onClick={() => setRole(roleOption.value)}
                >
                  <span className="role-label">{roleOption.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Processing...' : isRegister ? 'Register' : 'Login'}
          </button>
        </form>
        
        <div className="auth-footer">
          <button
            className="switch-button"
            onClick={() => setIsRegister(!isRegister)}
            disabled={loading}
          >
            {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
