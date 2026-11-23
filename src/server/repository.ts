import type {
  Book,
  BookStatus,
  BorrowRecord,
  Student,
} from '../lib/libraryLogic.ts';

export interface QueryResultLike<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number | null;
}

export interface DbClientLike {
  query<T = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResultLike<T>>;
  release?: () => void;
}

export interface DbPoolLike {
  query<T = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResultLike<T>>;
  connect(): Promise<DbClientLike>;
}

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const STUDENT_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS student (
  usn INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  department VARCHAR(100) NOT NULL
);`;

export const BOOK_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS book (
  book_id INT PRIMARY KEY,
  book_name VARCHAR(200) NOT NULL,
  author VARCHAR(150) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Available'
);`;

export const BORROW_LIST_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS borrow_list (
  borrow_id SERIAL PRIMARY KEY,
  usn INT REFERENCES student(usn) ON DELETE CASCADE,
  book_id INT REFERENCES book(book_id) ON DELETE CASCADE,
  borrow_date DATE DEFAULT CURRENT_DATE,
  return_date DATE,
  status VARCHAR(20) DEFAULT 'Borrowed'
);`;

export const SCHEMA_SQL = `${STUDENT_TABLE_SQL}\n${BOOK_TABLE_SQL}\n${BORROW_LIST_TABLE_SQL}`;

export const SEED_STUDENTS: Student[] = [
  { usn: 91, name: 'Keerthana Gowda', department: 'AIML' },
  { usn: 92, name: 'Aarav Sharma', department: 'CSE' },
  { usn: 93, name: 'Diya Nair', department: 'ECE' },
  { usn: 94, name: 'Rohan Kulkarni', department: 'ISE' },
  { usn: 95, name: 'Meera Iyer', department: 'AIML' },
];

export const SEED_BOOKS: Book[] = [
  {
    book_id: 2001,
    book_name: 'Pattern Recognition and Machine Learning',
    author: 'Christopher M. Bishop',
    status: 'Available',
  },
  {
    book_id: 2002,
    book_name: 'Designing Data-Intensive Applications',
    author: 'Martin Kleppmann',
    status: 'Available',
  },
  {
    book_id: 2003,
    book_name: 'Deep Learning',
    author: 'Ian Goodfellow, Yoshua Bengio, Aaron Courville',
    status: 'Available',
  },
  {
    book_id: 2004,
    book_name: 'Clean Architecture',
    author: 'Robert C. Martin',
    status: 'Available',
  },
  {
    book_id: 2005,
    book_name: 'Introduction to Algorithms',
    author: 'Thomas H. Cormen',
    status: 'Available',
  },
];

interface ColumnTypeRow {
  table_name: string;
  column_name: string;
  data_type: string;
  udt_name: string;
  character_maximum_length: number | null;
}

function mapColumnSqlType(col: ColumnTypeRow | undefined): string {
  if (!col) return 'INT';
  if (col.udt_name === 'int4' || col.data_type === 'integer') return 'INT';
  if (col.udt_name === 'int8' || col.data_type === 'bigint') return 'BIGINT';
  if (col.udt_name === 'int2' || col.data_type === 'smallint') return 'SMALLINT';
  if (col.data_type === 'character varying' || col.udt_name === 'varchar') {
    const len = col.character_maximum_length;
    return len && len > 0 ? `VARCHAR(${len})` : 'VARCHAR(100)';
  }
  if (col.data_type === 'text' || col.udt_name === 'text') return 'TEXT';
  return 'INT';
}

export async function initializeSchemaAndSeed(pool: DbPoolLike): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(STUDENT_TABLE_SQL);
    await client.query(
      "ALTER TABLE student ADD COLUMN IF NOT EXISTS name VARCHAR(100) NOT NULL DEFAULT ''",
    );
    await client.query(
      "ALTER TABLE student ADD COLUMN IF NOT EXISTS department VARCHAR(100) NOT NULL DEFAULT ''",
    );
    await client.query(BOOK_TABLE_SQL);
    await client.query(
      "ALTER TABLE book ADD COLUMN IF NOT EXISTS book_name VARCHAR(200) NOT NULL DEFAULT ''",
    );
    await client.query(
      "ALTER TABLE book ADD COLUMN IF NOT EXISTS author VARCHAR(150) NOT NULL DEFAULT ''",
    );
    await client.query(
      "ALTER TABLE book ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'Available'",
    );

    const colRes = await client.query<ColumnTypeRow>(
      `SELECT table_name, column_name, data_type, udt_name, character_maximum_length
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND ((table_name = 'student' AND column_name = 'usn')
           OR (table_name = 'book' AND column_name = 'book_id'))`,
    );

    const usnCol = colRes.rows.find(
      (r) => r.table_name === 'student' && r.column_name === 'usn',
    );
    const bookIdCol = colRes.rows.find(
      (r) => r.table_name === 'book' && r.column_name === 'book_id',
    );

    const usnSqlType = mapColumnSqlType(usnCol);
    const bookIdSqlType = mapColumnSqlType(bookIdCol);

    if (usnSqlType === 'INT' && bookIdSqlType === 'INT') {
      await client.query(BORROW_LIST_TABLE_SQL);
    } else {
      await client.query(`
        CREATE TABLE IF NOT EXISTS borrow_list (
          borrow_id SERIAL PRIMARY KEY,
          usn ${usnSqlType} REFERENCES student(usn) ON DELETE CASCADE,
          book_id ${bookIdSqlType} REFERENCES book(book_id) ON DELETE CASCADE,
          borrow_date DATE DEFAULT CURRENT_DATE,
          return_date DATE,
          status VARCHAR(20) DEFAULT 'Borrowed'
        );
      `);
    }
    await client.query(
      'ALTER TABLE borrow_list ADD COLUMN IF NOT EXISTS borrow_date DATE DEFAULT CURRENT_DATE',
    );
    await client.query(
      'ALTER TABLE borrow_list ADD COLUMN IF NOT EXISTS return_date DATE',
    );
    await client.query(
      "ALTER TABLE borrow_list ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Borrowed'",
    );

    const studentCountRes = await client.query<{ count: number }>(
      'SELECT COUNT(*)::int AS count FROM student',
    );
    const studentCount = Number(studentCountRes.rows[0]?.count ?? 0);
    if (studentCount === 0) {
      for (const s of SEED_STUDENTS) {
        await client.query(
          'INSERT INTO student (usn, name, department) VALUES ($1, $2, $3)',
          [s.usn, s.name, s.department],
        );
      }
    }

    const bookCountRes = await client.query<{ count: number }>(
      'SELECT COUNT(*)::int AS count FROM book',
    );
    const bookCount = Number(bookCountRes.rows[0]?.count ?? 0);
    if (bookCount === 0) {
      for (const b of SEED_BOOKS) {
        await client.query(
          'INSERT INTO book (book_id, book_name, author, status) VALUES ($1, $2, $3, $4)',
          [b.book_id, b.book_name, b.author, b.status],
        );
      }
    }

    const borrowCountRes = await client.query<{ count: number }>(
      'SELECT COUNT(*)::int AS count FROM borrow_list',
    );
    const borrowCount = Number(borrowCountRes.rows[0]?.count ?? 0);
    if (borrowCount === 0) {
      const checkSeedRefs = await client.query<{ usn: number | string }>(
        'SELECT usn FROM student ORDER BY usn ASC LIMIT 2',
      );
      const checkBookRefs = await client.query<{
        book_id: number | string;
        status: string;
      }>("SELECT book_id, status FROM book WHERE status = 'Available' ORDER BY book_id ASC LIMIT 2");

      const firstStudent = checkSeedRefs.rows[0];
      const secondStudent = checkSeedRefs.rows[1] ?? firstStudent;
      const firstBook = checkBookRefs.rows[0];
      const secondBook = checkBookRefs.rows[1];

      if (firstStudent && firstBook) {
        await client.query(
          `INSERT INTO borrow_list (usn, book_id, borrow_date, status)
           VALUES ($1, $2, CURRENT_DATE, 'Borrowed')`,
          [firstStudent.usn, firstBook.book_id],
        );
        await client.query(
          "UPDATE book SET status = 'Borrowed' WHERE book_id = $1",
          [firstBook.book_id],
        );

        if (secondStudent && secondBook) {
          await client.query(
            `INSERT INTO borrow_list (usn, book_id, borrow_date, return_date, status)
             VALUES ($1, $2, CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '3 days', 'Returned')`,
            [secondStudent.usn, secondBook.book_id],
          );
        }
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback error if transaction was not active
    }
    throw err;
  } finally {
    client.release?.();
  }
}

export async function listStudents(pool: DbPoolLike): Promise<Student[]> {
  const res = await pool.query<Student>(
    'SELECT usn, name, department FROM student ORDER BY usn ASC',
  );
  return res.rows;
}

export async function createStudent(
  pool: DbPoolLike,
  student: Student,
): Promise<Student> {
  const res = await pool.query<Student>(
    'INSERT INTO student (usn, name, department) VALUES ($1, $2, $3) RETURNING usn, name, department',
    [student.usn, student.name, student.department],
  );
  return res.rows[0];
}

export async function updateStudent(
  pool: DbPoolLike,
  usn: number | string,
  updates: { name: string; department: string },
): Promise<Student> {
  const res = await pool.query<Student>(
    'UPDATE student SET name = $1, department = $2 WHERE usn = $3 RETURNING usn, name, department',
    [updates.name, updates.department, usn],
  );
  if (res.rows.length === 0) {
    throw new HttpError(404, `Student with USN ${usn} was not found.`);
  }
  return res.rows[0];
}

export async function listBooks(pool: DbPoolLike): Promise<Book[]> {
  const res = await pool.query<Book>(
    'SELECT book_id, book_name, author, status FROM book ORDER BY book_id ASC',
  );
  return res.rows;
}

export async function createBook(pool: DbPoolLike, book: Book): Promise<Book> {
  const res = await pool.query<Book>(
    'INSERT INTO book (book_id, book_name, author, status) VALUES ($1, $2, $3, $4) RETURNING book_id, book_name, author, status',
    [book.book_id, book.book_name, book.author, book.status],
  );
  return res.rows[0];
}

export async function updateBook(
  pool: DbPoolLike,
  bookId: number | string,
  updates: { book_name: string; author: string; status: BookStatus },
): Promise<Book> {
  const res = await pool.query<Book>(
    'UPDATE book SET book_name = $1, author = $2, status = $3 WHERE book_id = $4 RETURNING book_id, book_name, author, status',
    [updates.book_name, updates.author, updates.status, bookId],
  );
  if (res.rows.length === 0) {
    throw new HttpError(404, `Book with ID ${bookId} was not found.`);
  }
  return res.rows[0];
}

const BORROW_SELECT_BASE = `
SELECT
  bl.borrow_id,
  bl.usn,
  s.name AS student_name,
  s.department,
  bl.book_id,
  b.book_name,
  b.author,
  TO_CHAR(bl.borrow_date, 'YYYY-MM-DD') AS borrow_date,
  TO_CHAR(bl.return_date, 'YYYY-MM-DD') AS return_date,
  bl.status
FROM borrow_list bl
JOIN student s ON bl.usn = s.usn
JOIN book b ON bl.book_id = b.book_id
`;

export async function listBorrows(pool: DbPoolLike): Promise<BorrowRecord[]> {
  const res = await pool.query<BorrowRecord>(
    `${BORROW_SELECT_BASE}
     ORDER BY CASE WHEN bl.status = 'Borrowed' THEN 0 ELSE 1 END, bl.borrow_id DESC`,
  );
  return res.rows;
}

export async function issueBook(
  pool: DbPoolLike,
  input: { usn: number | string; book_id: number | string },
): Promise<BorrowRecord> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const studentRes = await client.query<{ usn: number | string }>(
      'SELECT usn FROM student WHERE usn = $1',
      [input.usn],
    );
    if (studentRes.rows.length === 0) {
      throw new HttpError(404, `Student with USN ${input.usn} does not exist.`);
    }

    const bookRes = await client.query<{
      book_id: number | string;
      status: string;
    }>('SELECT book_id, status FROM book WHERE book_id = $1 FOR UPDATE', [
      input.book_id,
    ]);
    if (bookRes.rows.length === 0) {
      throw new HttpError(404, `Book with ID ${input.book_id} does not exist.`);
    }
    if (bookRes.rows[0].status !== 'Available') {
      throw new HttpError(
        409,
        `Book ID ${input.book_id} is currently marked as ${bookRes.rows[0].status}.`,
      );
    }

    const insertRes = await client.query<{ borrow_id: number }>(
      `INSERT INTO borrow_list (usn, book_id, borrow_date, status)
       VALUES ($1, $2, CURRENT_DATE, 'Borrowed')
       RETURNING borrow_id`,
      [input.usn, input.book_id],
    );
    const borrowId = insertRes.rows[0].borrow_id;

    await client.query(
      "UPDATE book SET status = 'Borrowed' WHERE book_id = $1",
      [input.book_id],
    );

    const joinedRes = await client.query<BorrowRecord>(
      `${BORROW_SELECT_BASE} WHERE bl.borrow_id = $1`,
      [borrowId],
    );

    await client.query('COMMIT');
    return joinedRes.rows[0];
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback error
    }
    throw err;
  } finally {
    client.release?.();
  }
}

export async function returnBook(
  pool: DbPoolLike,
  borrowId: number,
): Promise<BorrowRecord> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const borrowRes = await client.query<{
      borrow_id: number;
      book_id: number | string;
      status: string;
    }>(
      'SELECT borrow_id, book_id, status FROM borrow_list WHERE borrow_id = $1 FOR UPDATE',
      [borrowId],
    );
    if (borrowRes.rows.length === 0) {
      throw new HttpError(404, `Borrow record #${borrowId} was not found.`);
    }
    const record = borrowRes.rows[0];
    if (record.status === 'Returned') {
      throw new HttpError(
        409,
        `Borrow record #${borrowId} has already been returned.`,
      );
    }

    await client.query(
      "UPDATE borrow_list SET return_date = CURRENT_DATE, status = 'Returned' WHERE borrow_id = $1",
      [borrowId],
    );

    await client.query(
      "UPDATE book SET status = 'Available' WHERE book_id = $1",
      [record.book_id],
    );

    const joinedRes = await client.query<BorrowRecord>(
      `${BORROW_SELECT_BASE} WHERE bl.borrow_id = $1`,
      [borrowId],
    );

    await client.query('COMMIT');
    return joinedRes.rows[0];
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback error
    }
    throw err;
  } finally {
    client.release?.();
  }
}
