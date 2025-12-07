import axios from "axios";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AuthPage.css";

const AuthPage = ({ setUserRole, contract, accounts }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("patient"); // Default role
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = isRegister
      ? "http://localhost:5001/api/register"
      : "http://localhost:5001/api/login";

    setLoading(true);

    try {
      const payload = { username, password, role };

      // Include Ethereum address during registration for doctor or insurance
      if (isRegister && (role === "doctor" || role === "insurance")) {
        console.log("Accounts:", accounts);

        if (!accounts || accounts.length === 0) {
          alert("No Ethereum account found. Please connect your wallet.");
          setLoading(false);
          return;
        }

        payload.address = accounts[0];
        payload.name = username;
      }

      const response = await axios.post(endpoint, payload);
      console.log("Response:", response.data);

      if (isRegister) {
        // Backend handles blockchain registration for doctors and insurance
        // No need to call blockchain from frontend since backend does it with owner account
        if (response.data.message) {
          alert(response.data.message);
        } else {
          alert(
            "Registration successful! Please log in with your credentials."
          );
        }
        setIsRegister(false);
        setUsername("");
        setPassword("");
        return; // Stop further execution for registration
      }

      if (response.data.role) {
        // Login flow
        setUserRole(response.data.role);
        navigate(`/${response.data.role}`); // Redirect to the appropriate role page
      } else {
        alert("Authentication failed!"); // Fallback for unexpected scenarios
      }
    } catch (error) {
      console.error("Error:", error.response?.data || error.message);
      alert("Authentication failed!");
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { value: "patient", label: "Patient" },
    { value: "doctor", label: "Doctor/Hospital" },
    { value: "insurance", label: "Insurance Company" },
  ];

  return (
    <div className="auth-container">
      <div className="auth-content">
        <h1>MediChain</h1>
        <p className="auth-subtitle">
          {isRegister ? "Create your account" : "Welcome back"}
        </p>

        <form className="auth-form" onSubmit={handleAuth}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              className="username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Select Role</label>
            <div className="role-selection">
              {roles.map((roleOption) => (
                <button
                  key={roleOption.value}
                  type="button"
                  className={`role-box ${
                    role === roleOption.value ? "selected" : ""
                  }`}
                  onClick={() => setRole(roleOption.value)}
                >
                  <span className="role-label">{roleOption.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? "Processing..." : isRegister ? "Register" : "Login"}
          </button>
        </form>

        <div className="auth-footer">
          <button
            className="switch-button"
            onClick={() => setIsRegister(!isRegister)}
            disabled={loading}
          >
            {isRegister
              ? "Already have an account? Login"
              : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
