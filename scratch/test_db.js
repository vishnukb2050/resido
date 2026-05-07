const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:Vx2mj6rd3@database-1.cr0qoaway7on.ap-south-1.rds.amazonaws.com:5432/postgres'
});

client.connect()
  .then(() => {
    console.log('SUCCESS: Connected to RDS postgres database');
    return client.query('SELECT current_database();');
  })
  .then(res => {
    console.log('Database:', res.rows[0]);
    process.exit(0);
  })
  .catch(err => {
    console.error('FAILURE: Could not connect to RDS:', err.message);
    process.exit(1);
  });
