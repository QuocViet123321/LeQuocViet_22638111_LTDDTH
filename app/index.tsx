// app/index.tsx
import React, { useEffect, useState } from 'react';
import { Button, FlatList, SafeAreaView, Text, View } from 'react-native';
import { addBook, BookRow, getAllBooks, initDB } from '../db';

export default function Index() {
  const [books, setBooks] = useState<BookRow[]>([]);

  // Load DB + sample
  useEffect(() => {
    (async () => {
      try {
        await initDB();
        console.log("DB initialized");

        const existing = await getAllBooks();

        // Add sample book only if DB empty
        if (existing.length === 0) {
          await addBook("Sample Book", "Author A", "planning");
        }

        const all = await getAllBooks();
        setBooks(all);

      } catch (err) {
        console.error("DB init error:", err);
      }
    })();
  }, []);

  // UI
  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12 }}>
        Reading List (SQLite) — Demo
      </Text>

      <FlatList
        data={books}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 8 }}>
            <Text>{item.title} — {item.author ?? "Unknown"}</Text>
            <Text>Status: {item.status}</Text>
          </View>
        )}
        ListEmptyComponent={<Text>No books yet</Text>}
      />

      <Button
        title="Add demo book"
        onPress={async () => {
          await addBook(`New Book ${Date.now()}`, "You", "planning");
          const all = await getAllBooks();
          setBooks(all);
        }}
      />
    </SafeAreaView>
  );
}
