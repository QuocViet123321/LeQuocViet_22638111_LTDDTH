import * as SQLite from "expo-sqlite";

/* -------------------------------------------------------------------------- */
/*                           SINGLETON DATABASE INSTANCE                       */
/* -------------------------------------------------------------------------- */

let db: SQLite.SQLiteDatabase | null = null;

/** Get or create DB instance */
export async function getDB() {
  if (!db) {
    db = await SQLite.openDatabaseAsync("reading_list.db");
  }
  return db;
}

/* -------------------------------------------------------------------------- */
/*                          BOOK ROW TYPE (Reading List)                       */
/* -------------------------------------------------------------------------- */

export type BookRow = {
  id: number;
  title: string;
  author: string | null;
  status: "planning" | "reading" | "done";
  created_at: number; // timestamp (seconds)
};

/* -------------------------------------------------------------------------- */
/*                              INIT DATABASE                                  */
/* -------------------------------------------------------------------------- */

export async function initDB() {
  const database = await getDB();

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT,
      status TEXT DEFAULT 'planning',
      created_at INTEGER
    );
  `);
}

/* -------------------------------------------------------------------------- */
/*                                  CRUD BOOK                                 */
/* -------------------------------------------------------------------------- */

/** Add a new book */
export async function addBook(
  title: string,
  author: string = "",
  status: "planning" | "reading" | "done" = "planning",
  created_at?: number
) {
  const database = await getDB();
  const ts = created_at || Math.floor(Date.now() / 1000);

  await database.runAsync(
    "INSERT INTO books (title, author, status, created_at) VALUES (?, ?, ?, ?)",
    [title, author, status, ts]
  );
}

/** Get all books */
export async function getAllBooks(): Promise<BookRow[]> {
  const database = await getDB();

  return await database.getAllAsync<BookRow>(
    "SELECT * FROM books ORDER BY created_at DESC"
  );
}

/** Update book fields */
export async function updateBook(
  id: number,
  fields: Partial<Omit<BookRow, "id">>
) {
  const database = await getDB();

  const updates = [];
  const params: any[] = [];

  if (fields.title !== undefined) {
    updates.push("title = ?");
    params.push(fields.title);
  }
  if (fields.author !== undefined) {
    updates.push("author = ?");
    params.push(fields.author);
  }
  if (fields.status !== undefined) {
    updates.push("status = ?");
    params.push(fields.status);
  }
  if (fields.created_at !== undefined) {
    updates.push("created_at = ?");
    params.push(fields.created_at);
  }

  if (updates.length === 0) return;

  params.push(id);
  const sql = `UPDATE books SET ${updates.join(", ")} WHERE id = ?`;

  await database.runAsync(sql, params);
}

/** Delete a book */
export async function deleteBook(id: number) {
  const database = await getDB();
  await database.runAsync("DELETE FROM books WHERE id = ?", [id]);
}

/* -------------------------------------------------------------------------- */
/*                             IMPORT BOOKS FROM API                           */
/* -------------------------------------------------------------------------- */

/**
 * Import + merge list of books from an API.
 * Avoid duplicates using title.
 */
export async function importBooksFromAPI(apiUrl: string) {
  try {
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error("Fetch failed");

    const data: BookRow[] = await res.json();

    // All current books
    const existing = await getAllBooks();
    const existingTitles = new Set(existing.map((b) => b.title));

    // Merge — add only new titles
    for (const item of data) {
      if (!existingTitles.has(item.title)) {
        await addBook(
          item.title,
          item.author ?? "",
          item.status ?? "planning",
          item.created_at
        );
      }
    }
  } catch (err) {
    throw err;
  }
}
