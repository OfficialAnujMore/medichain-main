-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS digital_identity_verification;

-- Use the database
USE digital_identity_verification;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  ethereum_address VARCHAR(42),
  role ENUM('patient', 'doctor', 'insurance', 'admin') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create index on username for faster lookups
CREATE INDEX idx_username ON users(username);

-- Create index on role for faster role-based queries
CREATE INDEX idx_role ON users(role);

