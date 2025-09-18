import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 4000; // Internal container port; exposed via docker-compose

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'backend', port: PORT });
});

app.get('/api/config', (req, res) => {
  res.json({ api: 'backoffice-buys-softland', version: '0.1.0' });
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
