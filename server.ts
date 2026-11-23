import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateBookInput,
  validateBookUpdateInput,
  validateBorrowInput,
  validateStudentInput,
  validateStudentUpdateInput,
} from './src/lib/libraryLogic.ts';
import { getPool } from './src/server/db.ts';
import {
  createBook,
  createStudent,
  HttpError,
  initializeSchemaAndSeed,
  issueBook,
  listBooks,
  listBorrows,
  listStudents,
  returnBook,
  updateBook,
  updateStudent,
} from './src/server/repository.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

let dbInitialized = false;
let initPromise: Promise<void> | null = null;

async function ensureDbReady() {
  const pool = getPool();
  if (dbInitialized) return pool;

  if (!initPromise) {
    initPromise = initializeSchemaAndSeed(pool)
      .then(() => {
        dbInitialized = true;
      })
      .finally(() => {
        initPromise = null;
      });
  }
  await initPromise;
  return pool;
}

function sendError(res: express.Response, err: unknown) {
  const status = err instanceof HttpError ? err.statusCode : 500;
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : 'Unexpected server error';
  res.status(status).json({ error: message });
}

app.get('/api/health', async (_req, res) => {
  try {
    const pool = await ensureDbReady();
    await pool.query('SELECT 1');
    res.json({ ok: true, database: 'connected' });
  } catch (err) {
    sendError(res, err);
  }
});

app.get('/api/students', async (_req, res) => {
  try {
    const pool = await ensureDbReady();
    const students = await listStudents(pool);
    res.json({ students });
  } catch (err) {
    sendError(res, err);
  }
});

app.post('/api/students', async (req, res) => {
  try {
    const validated = validateStudentInput(req.body ?? {});
    if (!validated.ok) {
      res.status(400).json({ error: validated.error });
      return;
    }
    const pool = await ensureDbReady();
    const student = await createStudent(pool, validated.data);
    res.status(201).json({ student });
  } catch (err) {
    sendError(res, err);
  }
});

app.put('/api/students/:usn', async (req, res) => {
  try {
    const rawUsn = req.params.usn?.trim();
    if (!rawUsn) {
      res.status(400).json({ error: 'Invalid USN parameter.' });
      return;
    }
    const usn = /^\d+$/.test(rawUsn) ? Number(rawUsn) : rawUsn;
    const validated = validateStudentUpdateInput(req.body ?? {});
    if (!validated.ok) {
      res.status(400).json({ error: validated.error });
      return;
    }
    const pool = await ensureDbReady();
    const student = await updateStudent(pool, usn, validated.data);
    res.json({ student });
  } catch (err) {
    sendError(res, err);
  }
});

app.get('/api/books', async (_req, res) => {
  try {
    const pool = await ensureDbReady();
    const books = await listBooks(pool);
    res.json({ books });
  } catch (err) {
    sendError(res, err);
  }
});

app.post('/api/books', async (req, res) => {
  try {
    const validated = validateBookInput(req.body ?? {});
    if (!validated.ok) {
      res.status(400).json({ error: validated.error });
      return;
    }
    const pool = await ensureDbReady();
    const book = await createBook(pool, validated.data);
    res.status(201).json({ book });
  } catch (err) {
    sendError(res, err);
  }
});

app.put('/api/books/:book_id', async (req, res) => {
  try {
    const rawBookId = req.params.book_id?.trim();
    if (!rawBookId) {
      res.status(400).json({ error: 'Invalid book_id parameter.' });
      return;
    }
    const bookId = /^\d+$/.test(rawBookId) ? Number(rawBookId) : rawBookId;
    const validated = validateBookUpdateInput(req.body ?? {});
    if (!validated.ok) {
      res.status(400).json({ error: validated.error });
      return;
    }
    const pool = await ensureDbReady();
    const book = await updateBook(pool, bookId, validated.data);
    res.json({ book });
  } catch (err) {
    sendError(res, err);
  }
});

app.get('/api/borrows', async (_req, res) => {
  try {
    const pool = await ensureDbReady();
    const borrows = await listBorrows(pool);
    res.json({ borrows });
  } catch (err) {
    sendError(res, err);
  }
});

app.post('/api/borrows', async (req, res) => {
  try {
    const validated = validateBorrowInput(req.body ?? {});
    if (!validated.ok) {
      res.status(400).json({ error: validated.error });
      return;
    }
    const pool = await ensureDbReady();
    const borrow = await issueBook(pool, validated.data);
    res.status(201).json({ borrow });
  } catch (err) {
    sendError(res, err);
  }
});

async function handleReturnBook(req: express.Request, res: express.Response) {
  try {
    const borrowId = Number(req.params.borrow_id);
    if (!Number.isInteger(borrowId) || borrowId <= 0) {
      res.status(400).json({ error: 'Invalid borrow_id parameter.' });
      return;
    }
    const pool = await ensureDbReady();
    const borrow = await returnBook(pool, borrowId);
    res.json({ borrow });
  } catch (err) {
    sendError(res, err);
  }
}

app.post('/api/borrows/:borrow_id/return', handleReturnBook);
app.patch('/api/borrows/:borrow_id/return', handleReturnBook);

async function startServer() {
  if (process.env.DATABASE_URL?.trim()) {
    try {
      await ensureDbReady();
      console.log('PostgreSQL tables verified and seed check completed.');
    } catch (err) {
      console.error(
        'PostgreSQL startup initialization warning:',
        err instanceof Error ? err.message : err,
      );
    }
  } else {
    console.warn(
      'DATABASE_URL is not set. API routes will return configuration error until DATABASE_URL is provided.',
    );
  }

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Athenaeum server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
