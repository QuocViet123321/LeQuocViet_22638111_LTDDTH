import React, { useEffect, useMemo, useState } from "react";
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

// --- Constants & Helper ---
const statusOptions: Array<BookStatus | "all"> = [
  "all",
  "planning",
  "reading",
  "done",
];

// --- 1. Component BookItem ---
interface BookItemProps {
  item: BookRow;
  onPress: (book: BookRow) => void;
  onLongPress: (book: BookRow) => void;
  onRemove: (book: BookRow) => void;
}

const BookItem: React.FC<BookItemProps> = ({
  item,
  onPress,
  onLongPress,
  onRemove,
}) => {
  const color = useMemo(() => {
    switch (item.status) {
      case "planning":
        return "#6b7280";
      case "reading":
        return "#f59e0b";
      case "done":
        return "#10b981";
      default:
        return "#6b7280";
    }
  }, [item.status]);

  return (
    <Pressable
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress(item)}
      style={styles.bookItem}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={[styles.bookTitle, item.status === "done" && styles.doneTitle]}
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
        <TouchableOpacity onPress={() => onRemove(item)}>
          <Text style={styles.deleteText}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  );
};

// --- 2. Component StatusFilter ---
interface StatusFilterProps {
  filterStatus: BookStatus | "all";
  setFilterStatus: (status: BookStatus | "all") => void;
}

const StatusFilter: React.FC<StatusFilterProps> = ({
  filterStatus,
  setFilterStatus,
}) => (
  <View style={styles.filterRow}>
    {statusOptions.map((s) => (
      <TouchableOpacity
        key={s}
        onPress={() => setFilterStatus(s)}
        style={[styles.filterBtn, filterStatus === s && styles.filterBtnActive]}
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
);

// --- 3. Component AddModal ---
interface AddModalProps {
  visible: boolean;
  onClose: () => void;
  titleInput: string;
  setTitleInput: (text: string) => void;
  authorInput: string;
  setAuthorInput: (text: string) => void;
  onSave: (title: string, author: string | undefined) => Promise<void>;
}

const AddModal: React.FC<AddModalProps> = ({
  visible,
  onClose,
  titleInput,
  setTitleInput,
  authorInput,
  setAuthorInput,
  onSave,
}) => {
  const handleSave = async () => {
    await onSave(titleInput, authorInput || undefined);
    // State reset được thực hiện ở component cha (Index) sau khi đóng modal
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
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
            onPress={handleSave}
            style={styles.modalSave}
            disabled={!titleInput}
          >
            <Text style={styles.modalSaveText}>Lưu</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.modalCancel}>
            <Text style={styles.modalCancelText}>Hủy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// --- 4. Component EditModal ---
interface EditModalProps {
  visible: boolean;
  editing: BookRow | null;
  onClose: () => void;
  titleInput: string;
  setTitleInput: (text: string) => void;
  authorInput: string;
  setAuthorInput: (text: string) => void;
  onSave: (
    id: number,
    data: { title: string; author: string | null; status: BookStatus }
  ) => Promise<void>;
}

const EditModal: React.FC<EditModalProps> = ({
  visible,
  editing,
  onClose,
  titleInput,
  setTitleInput,
  authorInput,
  setAuthorInput,
  onSave,
}) => {
  // Quản lý trạng thái cục bộ cho Status trong khi chỉnh sửa
  const [status, setStatus] = useState<BookStatus>("planning");

  useEffect(() => {
    if (editing) {
      setTitleInput(editing.title);
      setAuthorInput(editing.author ?? "");
      setStatus(editing.status); // Đồng bộ trạng thái status từ book
    }
  }, [editing, setTitleInput, setAuthorInput]);

  const handleSave = async () => {
    if (!editing) return;
    await onSave(editing.id, {
      title: titleInput,
      author: authorInput || null,
      status: status,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
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
                onPress={() => setStatus(s)}
                style={[
                  styles.statusSelect,
                  status === s && styles.statusSelectActive,
                ]}
              >
                <Text
                  style={
                    status === s ? styles.statusTextActive : styles.statusText
                  }
                >
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={handleSave}
            style={styles.modalSave}
            disabled={!titleInput}
          >
            <Text style={styles.modalSaveText}>Lưu</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.modalCancel}>
            <Text style={styles.modalCancelText}>Hủy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// --- Component Chính Index ---

export default function Index() {
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
    (async () => {
      try {
        await initDB(true);
        await loadBooks();
      } catch (err) {
        console.error("Lỗi khởi tạo DB:", err);
      }
    })();
  }, []);

  // Hàm mở Modal chỉnh sửa
  const openEdit = (b: BookRow) => {
    setEditing(b);
    // Không cần set input ở đây, vì EditModal sẽ tự đồng bộ trong useEffect
    setEditModalVisible(true);
  };

  // Hàm đóng Modal và reset input
  const closeModalAndReset = () => {
    setAddModalVisible(false);
    setEditModalVisible(false);
    setEditing(null);
    setTitleInput("");
    setAuthorInput("");
  };

  // Hàm xử lý khi thêm sách thành công (khi AddModal gọi onSave)
  const handleAddBook = async (title: string, author: string | undefined) => {
    await addNewBook(title, author);
    closeModalAndReset(); // Reset input và đóng modal
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

  const renderItem = ({ item }: { item: BookRow }) => (
    <BookItem
      item={item}
      onPress={cycleStatus}
      onLongPress={openEdit}
      onRemove={removeBook}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Reading List</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            closeModalAndReset(); // Đảm bảo input sạch
            setAddModalVisible(true);
          }}
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
        />
        <StatusFilter
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
        />
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
      <AddModal
        visible={addModalVisible}
        onClose={closeModalAndReset}
        titleInput={titleInput}
        setTitleInput={setTitleInput}
        authorInput={authorInput}
        setAuthorInput={setAuthorInput}
        onSave={handleAddBook}
      />

      {/* Edit Modal */}
      <EditModal
        visible={editModalVisible}
        editing={editing}
        onClose={closeModalAndReset}
        titleInput={titleInput}
        setTitleInput={setTitleInput}
        authorInput={authorInput}
        setAuthorInput={setAuthorInput}
        onSave={editBook}
      />
    </SafeAreaView>
  );
}

// --- Styles (Giữ nguyên) ---

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
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  statusSelectActive: { backgroundColor: "#111827", borderColor: "#111827" },
  statusText: { textTransform: "capitalize", color: "#374151" },
  statusTextActive: { color: "#fff", textTransform: "capitalize" },
});
