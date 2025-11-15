// src/db.ts
import * as SQLite from "expo-sqlite";

export type BookStatus = "planning" | "reading" | "done";

export type BookRow = {
  id: number;
  title: string;
  author: string | null;
  status: BookStatus;
  created_at: number; // seconds
};

/* -------------------------------------------------------------------------- */
/*                          SINGLETON DATABASE INSTANCE                        */
/* -------------------------------------------------------------------------- */

let db: SQLite.WebSQLDatabase | null = null;

export async function getDB() {
  if (!db) {
    db = await SQLite.openDatabaseAsync("readinglist.db");
  }
  return db;
}

/* -------------------------------------------------------------------------- */
/*                                 INIT DB                                     */
/* -------------------------------------------------------------------------- */

export async function initDB(seed = true) {
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

  if (seed) {
    const existing = await database.getAllAsync("SELECT id FROM books LIMIT 1;");
    if (existing.length === 0) {
      const ts = Math.floor(Date.now() / 1000);
      await addBook("Clean Code", "Robert C. Martin", "planning", ts - 86400 * 10);
      await addBook("Atomic Habits", "James Clear", "planning", ts - 86400 * 5);
      await addBook("The Pragmatic Programmer", "Andrew Hunt", "reading", ts - 86400 * 2);
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                                   CRUD                                      */
/* -------------------------------------------------------------------------- */

export async function addBook(
  title: string,
  author: string | null = null,
  status: BookStatus = "planning",
  created_at?: number
) {
  const db = await getDB();
  const ts = created_at ?? Math.floor(Date.now() / 1000);

  await db.runAsync(
    "INSERT INTO books (title, author, status, created_at) VALUES (?, ?, ?, ?)",
    [title, author, status, ts]
  );
}

export async function getAllBooks(): Promise<BookRow[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<BookRow>(
    "SELECT * FROM books ORDER BY created_at DESC"
  );
  return rows.map((r) => ({
    ...r,
    status: (r.status as BookStatus) || "planning",
  }));
}

export async function updateBook(
  id: number,
  payload: { title?: string; author?: string | null; status?: BookStatus }
) {
  const db = await getDB();

  const fields: string[] = [];
  const values: any[] = [];

  if (payload.title !== undefined) {
    fields.push("title = ?");
    values.push(payload.title);
  }
  if (payload.author !== undefined) {
    fields.push("author = ?");
    values.push(payload.author);
  }
  if (payload.status !== undefined) {
    fields.push("status = ?");
    values.push(payload.status);
  }

  if (fields.length === 0) return;

  values.push(id);

  const sql = `UPDATE books SET ${fields.join(", ")} WHERE id = ?`;
  await db.runAsync(sql, values);
}

export async function cycleBookStatus(id: number, current: BookStatus) {
  const order: BookStatus[] = ["planning", "reading", "done"];
  const next = order[(order.indexOf(current) + 1) % order.length];

  const db = await getDB();
  await db.runAsync("UPDATE books SET status = ? WHERE id = ?", [next, id]);
  return next;
}

export async function deleteBook(id: number) {
  const db = await getDB();
  await db.runAsync("DELETE FROM books WHERE id = ?", [id]);
}

/* -------------------------------------------------------------------------- */
/*                              IMPORT FROM API                                */
/* -------------------------------------------------------------------------- */

export async function importBooksFromAPI(apiUrl: string) {
  try {
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error("Fetch failed");
    const data = await res.json();

    const items: Array<{ title?: string; author?: string | null }> = Array.isArray(data)
      ? data
      : [];

    const db = await getDB();

    const existing = await db.getAllAsync<{ title: string }>(
      "SELECT title FROM books"
    );

    const existingSet = new Set(existing.map((b) => b.title.toLowerCase()));

    let added = 0;

    for (const it of items) {
      const title = (it.title || "").trim();
      if (!title) continue;

      const key = title.toLowerCase();
      if (existingSet.has(key)) continue;

      await addBook(title, it.author ?? null, "planning");
      existingSet.add(key);
      added++;
    }

    return { added };
  } catch (err) {
    throw err;
  }
}
