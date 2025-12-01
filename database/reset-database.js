const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../my-app-backend/.env') });

// Require mysql2 from backend's node_modules
const backendNodeModules = path.join(__dirname, '../my-app-backend/node_modules');
const mysql = require(path.join(backendNodeModules, 'mysql2/promise'));

async function resetDatabase() {
  let connection;
  
  try {
    // Connect to MySQL (without specifying database first)
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS,
    });

    console.log('Connected to MySQL server');

    const dbName = process.env.DB_NAME || 'digital_identity_verification';

    // Drop the database if it exists (use query for DDL statements)
    console.log(`\n🗑️  Dropping database '${dbName}'...`);
    try {
      await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
      console.log(`✓ Database '${dbName}' dropped successfully`);
    } catch (err) {
      console.error('Error dropping database:', err.message);
    }

    // Recreate the database (use query for DDL statements)
    console.log(`\n📦 Creating fresh database '${dbName}'...`);
    await connection.query(`CREATE DATABASE \`${dbName}\``);
    console.log(`✓ Database '${dbName}' created successfully`);

    // Use the database (use query for DDL statements)
    await connection.query(`USE \`${dbName}\``);

    // Read and execute the schema file
    console.log('\n📋 Setting up database schema...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Remove comments and split by semicolons
    const statements = schema
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('--'))
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`Found ${statements.length} statements to execute`);
    
    for (const statement of statements) {
      // Skip CREATE DATABASE and USE statements (we already handled those)
      const upperStatement = statement.toUpperCase();
      if (upperStatement.includes('CREATE DATABASE') || upperStatement.includes('USE ')) {
        continue;
      }
      
      try {
        // Use query() for all DDL statements (CREATE TABLE, CREATE INDEX, etc.)
        await connection.query(statement);
        if (upperStatement.includes('CREATE TABLE')) {
          const tableMatch = statement.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?/i);
          console.log('✓ Created table:', tableMatch ? tableMatch[1] : 'table');
        } else if (upperStatement.includes('CREATE INDEX')) {
          const indexMatch = statement.match(/CREATE\s+INDEX\s+`?(\w+)`?/i);
          console.log('✓ Created index:', indexMatch ? indexMatch[1] : 'index');
        } else {
          console.log('✓ Executed:', statement.substring(0, 60) + '...');
        }
      } catch (err) {
        // Ignore "already exists" errors for IF NOT EXISTS statements
        if (err.code !== 'ER_TABLE_EXISTS_ERROR' && err.code !== 'ER_DUP_KEYNAME') {
          console.error('❌ Error executing statement:', err.message);
          console.error('Statement:', statement.substring(0, 100));
        } else {
          console.log('⚠️  Table/index already exists (skipped)');
        }
      }
    }

    console.log('\n✅ Database reset completed successfully!');
    console.log('Database:', dbName);
    console.log('All tables have been recreated with fresh schema.');
    console.log('\n⚠️  Note: Blockchain data (smart contract state) is not reset.');
    console.log('   To reset blockchain data, you need to:');
    console.log('   1. Stop Ganache');
    console.log('   2. Restart Ganache (this will create a fresh blockchain)');
    console.log('   3. Redeploy your smart contracts using: truffle migrate --reset');

  } catch (error) {
    console.error('❌ Error resetting database:', error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Please check your MySQL credentials in the .env file');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Ask for confirmation
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question('\n⚠️  WARNING: This will DELETE ALL DATA in the database!\nAre you sure you want to continue? (yes/no): ', answer => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    readline.close();
    resetDatabase();
  } else {
    console.log('Reset cancelled.');
    readline.close();
    process.exit(0);
  }
});
