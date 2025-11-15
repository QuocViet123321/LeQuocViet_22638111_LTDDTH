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
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      await initDB(true);
      await loadBooks();
    } catch (err) {
      console.error("Khởi tạo ứng dụng thất bại:", err);
      Alert.alert("Lỗi", "Không thể khởi tạo ứng dụng");
    }
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

    try {
      await addNewBook(titleInput.trim(), authorInput.trim() || undefined);
      setTitleInput("");
      setAuthorInput("");
      setAddModalVisible(false);
    } catch (error) {
      Alert.alert("Lỗi", "Không thể thêm sách mới");
    }
  };

  const handleSaveEdit = async () => {
    if (!editing) return;

    if (!titleInput.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tiêu đề sách");
      return;
    }

    try {
      await editBook(editing.id, {
        title: titleInput.trim(),
        author: authorInput.trim() || null,
        status: editing.status,
      });
      setEditModalVisible(false);
      setEditing(null);
    } catch (error) {
      Alert.alert("Lỗi", "Không thể cập nhật sách");
    }
  };

  const handleImport = async () => {
    const url = "https://68e9ecaff1eeb3f856e55f1e.mockapi.io/viet-22638111";
    try {
      await importFromApi(url);
      Alert.alert("Hoàn tất", "Đã import xong (nếu có sách mới).");
    } catch (err) {
      Alert.alert("Lỗi import", (err as any).message || String(err));
    }
  };

  const confirmDelete = (book: BookRow) => {
    Alert.alert("Xác nhận xóa", `Bạn có chắc muốn xóa sách "${book.title}"?`, [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: () => removeBook(book) },
    ]);
  };

  const getStatusColor = (status: BookStatus) => {
    switch (status) {
      case "planning":
        return "#6b7280";
      case "reading":
        return "#f59e0b";
      case "done":
        return "#10b981";
      default:
        return "#6b7280";
    }
  };

  const getStatusText = (status: BookStatus) => {
    switch (status) {
      case "planning":
        return "Dự định";
      case "reading":
        return "Đang đọc";
      case "done":
        return "Hoàn thành";
      default:
        return status;
    }
  };

  const renderItem = ({ item }: { item: BookRow }) => {
    const color = getStatusColor(item.status);
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
          <Text style={styles.bookAuthor}>
            {item.author ?? "Không có tác giả"}
          </Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text style={[styles.statusLabel, { color }]}>
            {getStatusText(item.status).toUpperCase()}
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
      <View style={styles.row}>
        <TextInput
          placeholder="Tìm theo tiêu đề..."
          value={searchText}
          onChangeText={setSearchText}
          style={[styles.input, { flex: 1 }]}
          placeholderTextColor="#9ca3af"
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
                {s === "all" ? "Tất cả" : getStatusText(s as BookStatus)}
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
          <RefreshControl
            refreshing={loading}
            onRefresh={loadBooks}
            colors={["#2563eb"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Chưa có sách trong danh sách đọc.
            </Text>
          </View>
        }
        contentContainerStyle={
          books.length === 0 ? styles.emptyContainer : styles.listContainer
        }
      />

      {/* Add Modal */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="fade"
        onRequestClose={resetModals}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Thêm sách</Text>
            <TextInput
              placeholder="Tiêu đề (bắt buộc)"
              value={titleInput}
              onChangeText={setTitleInput}
              style={styles.modalInput}
              placeholderTextColor="#9ca3af"
            />
            <TextInput
              placeholder="Tác giả (tuỳ chọn)"
              value={authorInput}
              onChangeText={setAuthorInput}
              style={styles.modalInput}
              placeholderTextColor="#9ca3af"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={handleSaveAdd}
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
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={resetModals}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sửa sách</Text>
            <TextInput
              placeholder="Tiêu đề"
              value={titleInput}
              onChangeText={setTitleInput}
              style={styles.modalInput}
              placeholderTextColor="#9ca3af"
            />
            <TextInput
              placeholder="Tác giả"
              value={authorInput}
              onChangeText={setAuthorInput}
              style={styles.modalInput}
              placeholderTextColor="#9ca3af"
            />

            {/* Status selection */}
            <Text style={styles.statusLabel}>Trạng thái:</Text>
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
                    {getStatusText(s)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={handleSaveEdit}
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
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f3f4f6",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f2937",
  },
  addButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  row: {
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 8,
    fontSize: 16,
  },
  filterRow: {
    flexDirection: "row",
    marginTop: 4,
    flexWrap: "wrap",
  },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginRight: 6,
    marginTop: 6,
  },
  filterBtnActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  filterText: {
    color: "#374151",
    fontSize: 12,
  },
  filterTextActive: {
    color: "#fff",
    fontSize: 12,
  },
  importBtn: {
    backgroundColor: "#10b981",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  importBtnDisabled: {
    backgroundColor: "#94a3b8",
  },
  importText: {
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
    fontSize: 16,
  },
  errText: {
    color: "#ef4444",
    marginBottom: 8,
    textAlign: "center",
  },
  bookItem: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  doneTitle: {
    textDecorationLine: "line-through",
    color: "#9ca3af",
  },
  bookAuthor: {
    fontSize: 14,
    color: "#6b7280",
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  metaText: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 4,
  },
  deleteText: {
    color: "#ef4444",
    fontWeight: "600",
    fontSize: 12,
  },
  empty: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#9ca3af",
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
  },
  listContainer: {
    paddingBottom: 30,
  },

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
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
  },
  modalSave: {
    backgroundColor: "#2563eb",
  },
  modalSaveText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16,
  },
  modalCancel: {
    backgroundColor: "#6b7280",
  },
  modalCancelText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16,
  },

  // Status selection styles
  statusContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  statusSelect: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  statusSelectActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  statusText: {
    fontSize: 14,
    color: "#374151",
  },
  statusTextActive: {
    color: "#fff",
    fontSize: 14,
  },
});
