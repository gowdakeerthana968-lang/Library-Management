import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterBooks,
  filterStudents,
  getAvailableBooks,
  getBookCounts,
  getPathFromPortal,
  getPortalFromPath,
  validateBookInput,
  validateBookUpdateInput,
  validateBorrowInput,
  validateStudentInput,
  validateStudentUpdateInput,
  type Book,
  type Student,
} from './libraryLogic';

test('portal path resolution maps routes cleanly', () => {
  assert.equal(getPortalFromPath('/'), 'student');
  assert.equal(getPortalFromPath('/student'), 'student');
  assert.equal(getPortalFromPath('/student/'), 'student');
  assert.equal(getPortalFromPath('/book'), 'book');
  assert.equal(getPortalFromPath('/borrowlist'), 'borrowlist');
  assert.equal(getPathFromPortal('student'), '/student');
  assert.equal(getPathFromPortal('book'), '/book');
  assert.equal(getPathFromPortal('borrowlist'), '/borrowlist');
});

test('filterStudents matches USN, name, and department case-insensitively', () => {
  const students: Student[] = [
    { usn: 91, name: 'Keerthana Gowda', department: 'AIML' },
    { usn: 92, name: 'Aarav Sharma', department: 'CSE' },
  ];

  assert.equal(filterStudents(students, '').length, 2);
  assert.deepEqual(filterStudents(students, '91').map((s) => s.usn), [91]);
  assert.deepEqual(filterStudents(students, 'keerthana').map((s) => s.usn), [91]);
  assert.deepEqual(filterStudents(students, 'cse').map((s) => s.usn), [92]);
  assert.equal(filterStudents(students, 'mech').length, 0);
});

test('filterBooks and counts reflect All, Available, and Borrowed filters', () => {
  const books: Book[] = [
    { book_id: 2001, book_name: 'Pattern Recognition', author: 'Bishop', status: 'Available' },
    { book_id: 2002, book_name: 'Clean Architecture', author: 'Martin', status: 'Borrowed' },
    { book_id: 2003, book_name: 'Deep Learning', author: 'Goodfellow', status: 'Available' },
  ];

  assert.deepEqual(getBookCounts(books), { total: 3, available: 2, borrowed: 1 });
  assert.equal(getAvailableBooks(books).length, 2);
  assert.equal(filterBooks(books, 'All', '').length, 3);
  assert.equal(filterBooks(books, 'Available', '').length, 2);
  assert.equal(filterBooks(books, 'Borrowed', '').length, 1);
  assert.deepEqual(
    filterBooks(books, 'Available', 'bishop').map((b) => b.book_id),
    [2001],
  );
});

test('student validation enforces positive integer USN and bounded text fields', () => {
  assert.deepEqual(
    validateStudentInput({ usn: '91', name: ' Keerthana Gowda ', department: ' AIML ' }),
    { ok: true, data: { usn: 91, name: 'Keerthana Gowda', department: 'AIML' } },
  );
  assert.equal(validateStudentInput({ usn: 0, name: 'Test', department: 'CSE' }).ok, false);
  assert.equal(validateStudentInput({ usn: 10.5, name: 'Test', department: 'CSE' }).ok, false);
  assert.equal(validateStudentInput({ usn: 10, name: '   ', department: 'CSE' }).ok, false);
  assert.equal(validateStudentUpdateInput({ name: 'Updated', department: '' }).ok, false);
});

test('book and borrow validation enforces required IDs and fields', () => {
  assert.deepEqual(
    validateBookInput({ book_id: 2001, book_name: 'Algorithms', author: 'Cormen' }),
    {
      ok: true,
      data: {
        book_id: 2001,
        book_name: 'Algorithms',
        author: 'Cormen',
        status: 'Available',
      },
    },
  );
  assert.equal(validateBookInput({ book_id: -1, book_name: 'A', author: 'B' }).ok, false);
  assert.equal(
    validateBookUpdateInput({ book_name: 'A', author: 'B', status: 'Lost' }).ok,
    false,
  );
  assert.deepEqual(validateBorrowInput({ usn: '91', book_id: '2001' }), {
    ok: true,
    data: { usn: 91, book_id: 2001 },
  });
  assert.equal(validateBorrowInput({ usn: '', book_id: '2001' }).ok, false);
});
