// src/screens/ReadingList.tsx
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BookRow, BookStatus, initDB } from "../db";
import { useBooks } from "./useBooks";

export default function ReadingList() {
  const {
    books,
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
  } = useBooks();

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<BookRow | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [authorInput, setAuthorInput] = useState("");

  useEffect(() => {
    (async () => {
      await initDB(true);
      await loadBooks();
    })();
  }, []);

  const openModal = (b?: BookRow) => {
    setEditing(b ?? null);
    setTitleInput(b?.title ?? "");
    setAuthorInput(b?.author ?? "");
    setModalVisible(true);
  };

  const saveModal = async () => {
    if (editing)
      await editBook(editing.id, {
        title: titleInput,
        author: authorInput || null,
        status: editing.status,
      });
    else await addNewBook(titleInput, authorInput || undefined);

    setModalVisible(false);
    setEditing(null);
    setTitleInput("");
    setAuthorInput("");
  };

  const handleImport = async () => {
    try {
      await importFromApi(
        "https://68e9ecaff1eeb3f856e55f1e.mockapi.io/viet-22638111"
      );
      Alert.alert("Hoàn tất", "Đã import dữ liệu.");
    } catch (e) {
      Alert.alert("Lỗi", String(e));
    }
  };

  const renderItem = ({ item }: { item: BookRow }) => {
    const color =
      item.status === "planning"
        ? "#6b7280"
        : item.status === "reading"
        ? "#f59e0b"
        : "#10b981";

    return (
      <Pressable
        onPress={() => cycleStatus(item)}
        onLongPress={() => openModal(item)}
        style={styles.bookItem}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.bookTitle,
              item.status === "done" && styles.doneTitle,
            ]}
          >
            {item.title}
          </Text>
          <Text style={styles.bookAuthor}>{item.author ?? "—"}</Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text style={[styles.statusLabel, { color }]}>{item.status}</Text>
          <Text style={styles.metaText}>
            {new Date(item.created_at * 1000).toLocaleDateString()}
          </Text>
          <TouchableOpacity onPress={() => removeBook(item)}>
            <Text style={styles.deleteText}>Xóa</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Reading List</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
          <Text style={styles.addButtonText}>+ Thêm</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        placeholder="Tìm theo tiêu đề..."
        value={searchText}
        onChangeText={setSearchText}
        style={styles.input}
      />

      <View style={styles.filterRow}>
        {["all", "planning", "reading", "done"].map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => setFilterStatus(s as any)}
            style={[
              styles.filterBtn,
              filterStatus === s && styles.filterBtnActive,
            ]}
          >
            <Text
              style={
                filterStatus === s ? styles.filterTextActive : styles.filterText
              }
            >
              {s === "all" ? "Tất cả" : s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        onPress={handleImport}
        disabled={importing}
        style={[styles.importBtn, importing && styles.importBtnDisabled]}
      >
        <Text style={styles.importText}>
          {importing ? "Đang import..." : "Import từ API"}
        </Text>
      </TouchableOpacity>

      {importError && <Text style={styles.errText}>{importError}</Text>}

      <FlatList
        data={books}
        keyExtractor={(i) => i.id.toString()}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadBooks} />
        }
        ListEmptyComponent={<Text style={styles.emptyText}>Chưa có sách.</Text>}
      />

      {/* ONE MODAL FOR ADD + EDIT */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editing ? "Sửa sách" : "Thêm sách"}
            </Text>

            <TextInput
              placeholder="Tiêu đề"
              value={titleInput}
              onChangeText={setTitleInput}
              style={styles.modalInput}
            />
            <TextInput
              placeholder="Tác giả"
              value={authorInput}
              onChangeText={setAuthorInput}
              style={styles.modalInput}
            />

            {editing && (
              <View style={styles.statusRow}>
                {["planning", "reading", "done"].map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() =>
                      setEditing({ ...editing, status: s as BookStatus })
                    }
                    style={[
                      styles.statusSelect,
                      editing.status === s && styles.statusSelectActive,
                    ]}
                  >
                    <Text
                      style={
                        editing.status === s
                          ? styles.statusTextActive
                          : styles.statusText
                      }
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.modalSave} onPress={saveModal}>
              <Text style={styles.modalSaveText}>Lưu</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f3f4f6" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerText: { fontSize: 22, fontWeight: "700" },
  addButton: { backgroundColor: "#2563eb", padding: 10, borderRadius: 8 },
  addButtonText: { color: "#fff", fontWeight: "600" },
  input: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  filterRow: { flexDirection: "row", flexWrap: "wrap", marginVertical: 6 },
  filterBtn: {
    padding: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    marginRight: 6,
  },
  filterBtnActive: { backgroundColor: "#111", borderColor: "#111" },
  filterText: { color: "#333" },
  filterTextActive: { color: "#fff" },
  importBtn: {
    backgroundColor: "#10b981",
    padding: 10,
    borderRadius: 10,
    marginTop: 6,
  },
  importBtnDisabled: { backgroundColor: "#aaa" },
  importText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  errText: { color: "red", marginVertical: 5 },
  bookItem: {
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 10,
    flexDirection: "row",
    marginBottom: 8,
  },
  bookTitle: { fontSize: 16, fontWeight: "600" },
  doneTitle: { textDecorationLine: "line-through", color: "#aaa" },
  bookAuthor: { fontSize: 12, color: "#666" },
  statusLabel: { fontSize: 12, fontWeight: "700", marginBottom: 4 },
  metaText: { fontSize: 11, color: "#777" },
  deleteText: { marginTop: 4, color: "red" },
  emptyText: { textAlign: "center", marginTop: 20, color: "#888" },

  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalContent: {
    backgroundColor: "#fff",
    margin: 20,
    padding: 16,
    borderRadius: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
  modalInput: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 10,
  },

  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statusSelect: { padding: 8, borderWidth: 1, borderRadius: 8 },
  statusSelectActive: { backgroundColor: "#111", borderColor: "#111" },
  statusText: { color: "#333" },
  statusTextActive: { color: "#fff" },

  modalSave: {
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  modalSaveText: { color: "#fff", textAlign: "center", fontWeight: "700" },
  modalCancel: { backgroundColor: "#ef4444", padding: 12, borderRadius: 8 },
  modalCancelText: { color: "#fff", textAlign: "center", fontWeight: "700" },
});
