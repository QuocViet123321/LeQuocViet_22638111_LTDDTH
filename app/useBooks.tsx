// src/hooks/useBooks.ts
import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";
import {
    addBook,
    BookRow,
    BookStatus,
    cycleBookStatus,
    deleteBook as dbDeleteBook,
    getAllBooks,
    importBooksFromAPI,
    updateBook,
} from "../db";

export function useBooks() {
  const [books, setBooks] = useState<BookRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const loadBooks = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getAllBooks();
      setBooks(rows);
    } catch (err: any) {
      console.error("loadBooks error:", err.message || err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addNewBook = useCallback(
    async (title: string, author?: string) => {
      if (!title.trim()) {
        Alert.alert("Lỗi", "Title không được rỗng");
        return;
      }
      await addBook(title.trim(), author?.trim() || null, "planning");
      await loadBooks();
    },
    [loadBooks]
  );

  const editBook = useCallback(
    async (id: number, payload: { title?: string; author?: string | null; status?: BookStatus }) => {
      if (payload.title !== undefined && !payload.title.trim()) {
        Alert.alert("Lỗi", "Title không được rỗng");
        return;
      }
      await updateBook(id, {
        title: payload.title?.trim(),
        author: payload.author === undefined ? undefined : payload.author?.trim() ?? null,
        status: payload.status,
      });
      setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, ...payload } as BookRow : b)));
    },
    []
  );

  const cycleStatus = useCallback(
    async (book: BookRow) => {
      const next = await cycleBookStatus(book.id, book.status);
      setBooks((prev) => prev.map((b) => (b.id === book.id ? { ...b, status: next } : b)));
    },
    []
  );

  const removeBook = useCallback(
    async (book: BookRow) => {
      Alert.alert("Xác nhận", `Bạn có muốn xóa "${book.title}" không?`, [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            await dbDeleteBook(book.id);
            setBooks((prev) => prev.filter((b) => b.id !== book.id));
          },
        },
      ]);
    },
    []
  );

  const importFromApi = useCallback(
    async (url: string) => {
      setImporting(true);
      setImportError(null);
      try {
        const result = await importBooksFromAPI(url);
        await loadBooks();
        return result;
      } catch (err: any) {
        setImportError(err.message || String(err));
        throw err;
      } finally {
        setImporting(false);
      }
    },
    [loadBooks]
  );

  // Search & filter
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState<BookStatus | "all">("all");

  const filtered = useMemo(() => {
    let list = books;
    const text = searchText.trim().toLowerCase();
    if (text) {
      list = list.filter((b) => b.title.toLowerCase().includes(text));
    }
    if (filterStatus !== "all") {
      list = list.filter((b) => b.status === filterStatus);
    }
    return list;
  }, [books, searchText, filterStatus]);

  return {
    books: filtered,
    rawBooks: books,
    loading,
    importing,
    importError,
    searchText,
    setSearchText,
    filterStatus,
    setFilterStatus,
    loadBooks,
    addNewBook,
    editBook,
    cycleStatus,
    removeBook,
    importFromApi,
  };
}
