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

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [authorInput, setAuthorInput] = useState("");
  const [editing, setEditing] = useState<BookRow | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    await initDB(true);
    await loadBooks();
  };

  const openEdit = (b: BookRow) => {
    setEditing(b);
    setTitleInput(b.title);
    setAuthorInput(b.author ?? "");
    setEditModalVisible(true);
  };

  const handleSaveAdd = async () => {
    if (!titleInput.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tiêu đề sách");
      return;
    }
    await addNewBook(titleInput.trim(), authorInput.trim() || undefined);
    resetModals();
  };

  const handleSaveEdit = async () => {
    if (!editing || !titleInput.trim()) return;
    await editBook(editing.id, {
      title: titleInput.trim(),
      author: authorInput.trim() || null,
      status: editing.status,
    });
    resetModals();
  };

  const handleImport = async () => {
    try {
      await importFromApi(
        "https://68e9ecaff1eeb3f856e55f1e.mockapi.io/viet-22638111"
      );
      Alert.alert("Hoàn tất", "Đã import xong");
    } catch (err) {
      Alert.alert("Lỗi import", (err as any).message);
    }
  };

  const confirmDelete = (book: BookRow) => {
    Alert.alert("Xác nhận xóa", `Xóa "${book.title}"?`, [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: () => removeBook(book) },
    ]);
  };

  const getStatusInfo = (status: BookStatus) => {
    const statusMap = {
      planning: { color: "#6b7280", text: "Dự định" },
      reading: { color: "#f59e0b", text: "Đang đọc" },
      done: { color: "#10b981", text: "Hoàn thành" },
    };
    return statusMap[status] || statusMap.planning;
  };

  const renderItem = ({ item }: { item: BookRow }) => {
    const statusInfo = getStatusInfo(item.status);
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
          <Text style={[styles.statusLabel, { color: statusInfo.color }]}>
            {statusInfo.text.toUpperCase()}
          </Text>
          <Text style={styles.metaText}>
            {new Date(item.created_at * 1000).toLocaleDateString("vi-VN")}
          </Text>
          <TouchableOpacity onPress={() => confirmDelete(item)}>
            <Text style={styles.deleteText}>Xóa</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    );
  };

  const resetModals = () => {
    setAddModalVisible(false);
    setEditModalVisible(false);
    setEditing(null);
    setTitleInput("");
    setAuthorInput("");
  };

  const ModalContent = ({ isEdit = false }) => (
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>{isEdit ? "Sửa sách" : "Thêm sách"}</Text>

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

      {isEdit && (
        <View style={styles.statusContainer}>
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
                {getStatusInfo(s).text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.modalButtons}>
        <TouchableOpacity
          onPress={isEdit ? handleSaveEdit : handleSaveAdd}
          style={[styles.modalButton, styles.modalSave]}
          disabled={!titleInput.trim()}
        >
          <Text style={styles.modalSaveText}>Lưu</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={resetModals}
          style={[styles.modalButton, styles.modalCancel]}
        >
          <Text style={styles.modalCancelText}>Hủy</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Danh sách đọc</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setAddModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Thêm</Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filter */}
      <TextInput
        placeholder="Tìm theo tiêu đề..."
        value={searchText}
        onChangeText={setSearchText}
        style={styles.input}
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
                filterStatus === s ? styles.filterTextActive : styles.filterText
              }
            >
              {s === "all" ? "Tất cả" : getStatusInfo(s as BookStatus).text}
            </Text>
          </TouchableOpacity>
        ))}
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
      {importError && <Text style={styles.errText}>{importError}</Text>}

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
            <Text style={styles.emptyText}>Chưa có sách</Text>
          </View>
        }
      />

      {/* Modals */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="fade"
        onRequestClose={resetModals}
      >
        <View style={styles.modalOverlay}>
          <ModalContent />
        </View>
      </Modal>

      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={resetModals}
      >
        <View style={styles.modalOverlay}>
          <ModalContent isEdit />
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
    marginBottom: 16,
  },
  headerText: { fontSize: 24, fontWeight: "700", color: "#1f2937" },
  addButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addButtonText: { color: "#fff", fontWeight: "600" },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 8,
  },
  filterRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginRight: 6,
    marginTop: 6,
  },
  filterBtnActive: { backgroundColor: "#111827", borderColor: "#111827" },
  filterText: { color: "#374151", fontSize: 12 },
  filterTextActive: { color: "#fff", fontSize: 12 },
  importBtn: {
    backgroundColor: "#10b981",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  importBtnDisabled: { backgroundColor: "#94a3b8" },
  importText: { color: "#fff", fontWeight: "600", textAlign: "center" },
  errText: { color: "#ef4444", marginBottom: 8, textAlign: "center" },
  bookItem: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  doneTitle: { textDecorationLine: "line-through", color: "#9ca3af" },
  bookAuthor: { fontSize: 14, color: "#6b7280" },
  statusLabel: { fontSize: 12, fontWeight: "700", marginBottom: 4 },
  metaText: { fontSize: 11, color: "#6b7280", marginBottom: 4 },
  deleteText: { color: "#ef4444", fontWeight: "600", fontSize: 12 },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { color: "#9ca3af", fontSize: 16 },

  // Modal styles
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
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  modalInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalButton: { flex: 1, padding: 14, borderRadius: 8 },
  modalSave: { backgroundColor: "#2563eb" },
  modalSaveText: { color: "#fff", textAlign: "center", fontWeight: "700" },
  modalCancel: { backgroundColor: "#6b7280" },
  modalCancelText: { color: "#fff", textAlign: "center", fontWeight: "700" },

  // Status selection
  statusContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  statusSelect: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  statusSelectActive: { backgroundColor: "#111827", borderColor: "#111827" },
  statusText: { fontSize: 14, color: "#374151" },
  statusTextActive: { color: "#fff", fontSize: 14 },
});
