import { Pool } from 'pg';

// Reaproveitado entre invocações "quentes" da Lambda (mesmo container) — evita
// abrir uma conexão nova a cada chamada.
let pool: Pool | undefined;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      max: 1, // Lambda: uma conexão por container é suficiente e evita esgotar o RDS
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

export interface ClienteRow {
  id: string;
  nome: string;
  documento: string;
  email: string;
}

export async function buscarClientePorDocumento(documento: string): Promise<ClienteRow | null> {
  const result = await getPool().query<ClienteRow>(
    'SELECT id, nome, documento, email FROM clientes WHERE documento = $1 LIMIT 1',
    [documento],
  );
  return result.rows[0] ?? null;
}
