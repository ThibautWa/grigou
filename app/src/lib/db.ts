import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default pool;

export interface Transaction {
  id: number;
  type: 'income' | 'outcome';
  amount: number;
  description: string;
  category: string | null;
  date: string;
  created_at: Date;
  updated_at: Date;
}
