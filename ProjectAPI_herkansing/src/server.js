import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { pool } from './db.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));   // ruim genoeg voor een base64-bon

app.get('/api/health', async (req, res) => {
  const { rows } = await pool.query('SELECT now()');
  res.json({ status: 'ok', time: rows[0].now });
});


const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => console.log(`API draait op poort ${port}`));