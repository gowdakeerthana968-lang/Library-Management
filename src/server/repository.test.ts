import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeDatabaseUrlForSsl } from './db';
import {
  HttpError,
  SCHEMA_SQL,
  SEED_BOOKS,
  SEED_STUDENTS,
  initializeSchemaAndSeed,
  issueBook,
  returnBook,
  type DbClientLike,
  type DbPoolLike,
} from './repository';

test('sanitizeDatabaseUrlForSsl removes sslmode so pg honors rejectUnauthorized: false', () => {
  const sanitized = sanitizeDatabaseUrlForSsl(
    'postgres://avnadmin:secret@pg-123.aivencloud.com:12345/defaultdb?sslmode=require',
  );
  assert.equal(sanitized.includes('sslmode'), false);
  assert.equal(
    sanitized,
    'postgres://avnadmin:secret@pg-123.aivencloud.com:12345/defaultdb',
  );
});

test('SCHEMA_SQL defines the exact three required tables and columns', () => {
  assert.match(SCHEMA_SQL, /CREATE TABLE IF NOT EXISTS student/i);
  assert.match(SCHEMA_SQL, /usn INT PRIMARY KEY/i);
  assert.match(SCHEMA_SQL, /CREATE TABLE IF NOT EXISTS book/i);
  assert.match(SCHEMA_SQL, /book_id INT PRIMARY KEY/i);
  assert.match(SCHEMA_SQL, /CREATE TABLE IF NOT EXISTS borrow_list/i);
  assert.match(SCHEMA_SQL, /borrow_id SERIAL PRIMARY KEY/i);
  assert.match(SCHEMA_SQL, /REFERENCES student\(usn\) ON DELETE CASCADE/i);
  assert.match(SCHEMA_SQL, /REFERENCES book\(book_id\) ON DELETE CASCADE/i);
});

test('seed data includes USN 91 Keerthana Gowda AIML and books 2001-2005', () => {
  const keerthana = SEED_STUDENTS.find((s) => s.usn === 91);
  assert.deepEqual(keerthana, {
    usn: 91,
    name: 'Keerthana Gowda',
    department: 'AIML',
  });
  assert.deepEqual(
    SEED_BOOKS.map((b) => b.book_id),
    [2001, 2002, 2003, 2004, 2005],
  );
});

test('initializeSchemaAndSeed inserts sample records only when tables are empty', async () => {
  const executed: string[] = [];

  const mockClient: DbClientLike = {
    async query<T = Record<string, unknown>>(text: string) {
      executed.push(text.trim());
      if (text.includes('FROM student')) {
        return { rows: [{ count: 1 } as T], rowCount: 1 };
      }
      if (text.includes('FROM book')) {
        return { rows: [{ count: 1 } as T], rowCount: 1 };
      }
      if (text.includes('FROM borrow_list')) {
        return { rows: [{ count: 1 } as T], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    release() {},
  };

  const mockPool: DbPoolLike = {
    async query<T = Record<string, unknown>>(text: string) {
      return mockClient.query<T>(text);
    },
    async connect() {
      return mockClient;
    },
  };

  await initializeSchemaAndSeed(mockPool);

  assert.equal(executed.some((sql) => sql.startsWith('INSERT INTO student')), false);
  assert.equal(executed.some((sql) => sql.startsWith('INSERT INTO book')), false);
  assert.equal(executed.some((sql) => sql.startsWith('INSERT INTO borrow_list')), false);
});

test('issueBook rejects already-borrowed books with 409 and rolls back', async () => {
  const queries: string[] = [];
  const mockClient: DbClientLike = {
    async query<T = Record<string, unknown>>(text: string) {
      queries.push(text.trim());
      if (text.includes('FROM student WHERE usn')) {
        return { rows: [{ usn: 91 } as T], rowCount: 1 };
      }
      if (text.includes('FROM book WHERE book_id')) {
        return { rows: [{ book_id: 2005, status: 'Borrowed' } as T], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    },
    release() {},
  };

  const mockPool: DbPoolLike = {
    async query<T = Record<string, unknown>>(text: string) {
      return mockClient.query<T>(text);
    },
    async connect() {
      return mockClient;
    },
  };

  await assert.rejects(
    () => issueBook(mockPool, { usn: 91, book_id: 2005 }),
    (err: unknown) => err instanceof HttpError && err.statusCode === 409,
  );
  assert.equal(queries.includes('ROLLBACK'), true);
});

test('returnBook updates borrow_list status and resets book status to Available', async () => {
  const queries: { sql: string; values?: unknown[] }[] = [];

  const mockClient: DbClientLike = {
    async query<T = Record<string, unknown>>(text: string, values?: unknown[]) {
      queries.push({ sql: text.trim(), values });
      if (text.includes('FROM borrow_list WHERE borrow_id')) {
        return {
          rows: [{ borrow_id: 7, book_id: 2005, status: 'Borrowed' } as T],
          rowCount: 1,
        };
      }
      if (text.includes('JOIN student s ON bl.usn = s.usn')) {
        return {
          rows: [
            {
              borrow_id: 7,
              usn: 91,
              student_name: 'Keerthana Gowda',
              department: 'AIML',
              book_id: 2005,
              book_name: 'Introduction to Algorithms',
              author: 'Thomas H. Cormen',
              borrow_date: '2026-11-23',
              return_date: '2026-11-23',
              status: 'Returned',
            } as T,
          ],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 1 };
    },
    release() {},
  };

  const mockPool: DbPoolLike = {
    async query<T = Record<string, unknown>>(text: string, values?: unknown[]) {
      return mockClient.query<T>(text, values);
    },
    async connect() {
      return mockClient;
    },
  };

  const result = await returnBook(mockPool, 7);
  assert.equal(result.status, 'Returned');
  assert.equal(
    queries.some((q) =>
      q.sql.includes("UPDATE borrow_list SET return_date = CURRENT_DATE, status = 'Returned'"),
    ),
    true,
  );
  assert.equal(
    queries.some((q) => q.sql.includes("UPDATE book SET status = 'Available'")),
    true,
  );
  assert.equal(queries.some((q) => q.sql === 'COMMIT'), true);
});
