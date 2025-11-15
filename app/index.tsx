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

export default function Index() {
  const {
    books,
    rawBooks,
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

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [authorInput, setAuthorInput] = useState("");
  const [editing, setEditing] = useState<BookRow | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await initDB(true);
        await loadBooks();
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  const openEdit = (b: BookRow) => {
    setEditing(b);
    setTitleInput(b.title);
    setAuthorInput(b.author ?? "");
    setEditModalVisible(true);
  };

  const handleSaveAdd = async () => {
    await addNewBook(titleInput, authorInput || undefined);
    setTitleInput("");
    setAuthorInput("");
    setAddModalVisible(false);
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    await editBook(editing.id, {
      title: titleInput,
      author: authorInput || null,
      status: editing.status,
    });
    setEditModalVisible(false);
    setEditing(null);
  };

  const handleImport = async () => {
    // Example API — replace with real one when needed
    const url = "https://68e9ecaff1eeb3f856e55f1e.mockapi.io/viet-22638111";
    try {
      await importFromApi(url);
      Alert.alert("Hoàn tất", "Đã import xong (nếu có sách mới).");
    } catch (err) {
      Alert.alert("Lỗi import", (err as any).message || String(err));
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
        onLongPress={() => openEdit(item)}
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
          <Text style={[styles.statusLabel, { color }]}>
            {item.status.toUpperCase()}
          </Text>
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Reading List</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setAddModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Thêm</Text>
        </TouchableOpacity>
      </View>
      <View></View>

      {/* Search & Filter */}
      <View style={styles.row}>
        <TextInput
          placeholder="Tìm theo tiêu đề..."
          value={searchText}
          onChangeText={setSearchText}
          style={[styles.input, { flex: 1 }]}
        />
        <View style={styles.filterRow}>
          {(
            ["all", "planning", "reading", "done"] as Array<BookStatus | "all">
          ).map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setFilterStatus(s)}
              style={[
                styles.filterBtn,
                filterStatus === s && styles.filterBtnActive,
              ]}
            >
              <Text
                style={
                  filterStatus === s
                    ? styles.filterTextActive
                    : styles.filterText
                }
              >
                {s === "all" ? "Tất cả" : s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Import */}
      <TouchableOpacity
        onPress={handleImport}
        disabled={importing}
        style={[styles.importBtn, importing && styles.importBtnDisabled]}
      >
        <Text style={styles.importText}>
          {importing ? "Đang import..." : "Import từ API"}
        </Text>
      </TouchableOpacity>
      {importError ? <Text style={styles.errText}>{importError}</Text> : null}

      {/* List */}
      <FlatList
        data={books}
        keyExtractor={(i) => i.id.toString()}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadBooks} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Chưa có sách trong danh sách đọc.
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 30 }}
      />

      {/* Add Modal */}
      <Modal visible={addModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Thêm sách</Text>
            <TextInput
              placeholder="Tiêu đề (bắt buộc)"
              value={titleInput}
              onChangeText={setTitleInput}
              style={styles.modalInput}
            />
            <TextInput
              placeholder="Tác giả (tuỳ chọn)"
              value={authorInput}
              onChangeText={setAuthorInput}
              style={styles.modalInput}
            />
            <TouchableOpacity
              onPress={async () => {
                await handleSaveAdd();
              }}
              style={styles.modalSave}
            >
              <Text style={styles.modalSaveText}>Lưu</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setAddModalVisible(false)}
              style={styles.modalCancel}
            >
              <Text style={styles.modalCancelText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sửa sách</Text>
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

            {/* Status selection (simple buttons) */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              {(["planning", "reading", "done"] as BookStatus[]).map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() =>
                    setEditing((prev) => (prev ? { ...prev, status: s } : prev))
                  }
                  style={[
                    styles.statusSelect,
                    editing?.status === s && styles.statusSelectActive,
                  ]}
                >
                  <Text
                    style={
                      editing?.status === s
                        ? styles.statusTextActive
                        : styles.statusText
                    }
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={async () => {
                if (!editing) return;
                await editBook(editing.id, {
                  title: titleInput,
                  author: authorInput || null,
                  status: editing.status,
                });
                setEditModalVisible(false);
                setEditing(null);
              }}
              style={styles.modalSave}
            >
              <Text style={styles.modalSaveText}>Lưu</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setEditModalVisible(false)}
              style={styles.modalCancel}
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
    alignItems: "center",
    marginBottom: 12,
  },
  headerText: { fontSize: 24, fontWeight: "700", color: "#1f2937" },
  addButton: { backgroundColor: "#2563eb", padding: 10, borderRadius: 10 },
  addButtonText: { color: "#fff", fontWeight: "600" },
  row: { marginBottom: 8 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 8,
  },
  filterRow: { flexDirection: "row", marginTop: 4, flexWrap: "wrap" },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginRight: 6,
    marginTop: 6,
  },
  filterBtnActive: { backgroundColor: "#111827", borderColor: "#111827" },
  filterText: { color: "#374151", textTransform: "capitalize" },
  filterTextActive: { color: "#fff", textTransform: "capitalize" },
  importBtn: {
    backgroundColor: "#10b981",
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  importBtnDisabled: { backgroundColor: "#94a3b8" },
  importText: { color: "#fff", fontWeight: "600", textAlign: "center" },
  errText: { color: "#ef4444", marginBottom: 8 },
  bookItem: {
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  bookTitle: { fontSize: 16, fontWeight: "600", color: "#111827" },
  doneTitle: { textDecorationLine: "line-through", color: "#9ca3af" },
  bookAuthor: { fontSize: 12, color: "#6b7280", marginTop: 3 },
  statusLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  metaText: { fontSize: 11, color: "#6b7280" },
  deleteText: { color: "#ef4444", marginTop: 6, fontWeight: "600" },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { color: "#9ca3af" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  modalInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  modalSave: {
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  modalSaveText: { color: "#fff", textAlign: "center", fontWeight: "700" },
  modalCancel: { backgroundColor: "#ef4444", padding: 12, borderRadius: 8 },
  modalCancelText: { color: "#fff", textAlign: "center", fontWeight: "700" },
  statusSelect: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  statusSelectActive: { backgroundColor: "#111827", borderColor: "#111827" },
  statusText: { textTransform: "capitalize", color: "#374151" },
  statusTextActive: { color: "#fff", textTransform: "capitalize" },
});
