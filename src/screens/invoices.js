import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase-config";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  TextField,
  CircularProgress,
  TableSortLabel,
  TableContainer,
  Paper,
  useMediaQuery,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  TablePagination,
  IconButton,
  Stack,
  Box,
} from "@mui/material";
import { Eye, Trash2, Search } from "lucide-react";
import InvoiceModal from "../components/invoice-modal";
import Header from "../components/header";
import { Input, Widgets } from "@mui/icons-material";

const InvoiceScreen = () => {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [orderStatusValue, setOrderStatusValue] = useState("");
  const [paymentStatusValue, setPaymentStatusValue] = useState("");
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(30);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isMobile = useMediaQuery("(max-width:600px)");

  useEffect(() => {
    const q = query(collection(db, "invoices"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const invoiceData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setInvoices(invoiceData);
      setFilteredInvoices(invoiceData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSort = (column) => {
    let direction = "asc";
    if (sortConfig.key === column && sortConfig.direction === "asc") {
      direction = "desc";
    }

    const sorted = [...filteredInvoices].sort((a, b) => {
      if (column === "totalPrice") {
        return direction === "asc"
          ? parseFloat(a[column]) - parseFloat(b[column])
          : parseFloat(b[column]) - parseFloat(a[column]);
      }

      if (column === "createdAt") {
        return direction === "asc"
          ? new Date(a[column]) - new Date(b[column])
          : new Date(b[column]) - new Date(a[column]);
      }

      if (a[column] < b[column]) return direction === "asc" ? -1 : 1;
      if (a[column] > b[column]) return direction === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredInvoices(sorted);
    setSortConfig({ key: column, direction });
  };

  const handleOrderStatusChange = async (invoiceId, newStatus) => {
    try {
      const invoiceRef = doc(db, "invoices", invoiceId);
      await updateDoc(invoiceRef, { orderStatus: newStatus });
      setEditingInvoiceId(null);
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  const handlePaymentStatusChange = async (invoiceId, isPaid) => {
    try {
      const invoiceRef = doc(db, "invoices", invoiceId);
      await updateDoc(invoiceRef, { isBillPaid: isPaid });
      console.log(invoiceRef,"its ref",invoiceId)
      setEditingInvoiceId(null);
    } catch (error) {
      console.error("Error updating payment status:", error);
    }
  };

  const handleDelete = async () => {
    const updateSoldQuantity = async (item) => {
      // Query inventoryItems for the matching item
      const q = query(
        collection(db, "inventoryItems"),
        where("title", "==", item.title),
        where("brand", "==", item.brand)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0].ref; // Assuming unique titles/brands
        const inventoryItem = querySnapshot.docs[0].data();

        // Update soldQuantity
        await updateDoc(docRef, {
          soldQuantity: Math.max(0, inventoryItem.soldQuantity - item.quantity), // Ensure non-negative value
        });
      }
    };

    if (deleteType === "single" && invoiceToDelete) {
      // Fetch the invoice data
      const invoiceDoc = await getDoc(doc(db, "invoices", invoiceToDelete));
      if (invoiceDoc.exists()) {
        const invoice = invoiceDoc.data();
        for (const item of invoice.items) {
          await updateSoldQuantity(item);
        }
      }

      // Delete the invoice
      await deleteDoc(doc(db, "invoices", invoiceToDelete));
      setFilteredInvoices((prev) =>
        prev.filter((invoice) => invoice.id !== invoiceToDelete)
      );
    } else if (deleteType === "multiple") {
      for (const id of selectedInvoices) {
        const invoiceDoc = await getDoc(doc(db, "invoices", id));
        if (invoiceDoc.exists()) {
          const invoice = invoiceDoc.data();
          for (const item of invoice.items) {
            await updateSoldQuantity(item);
          }
        }

        // Delete each invoice
        await deleteDoc(doc(db, "invoices", id));
      }

      setInvoices((prev) =>
        prev.filter((invoice) => !selectedInvoices.includes(invoice.id))
      );
      setFilteredInvoices((prev) =>
        prev.filter((invoice) => !selectedInvoices.includes(invoice.id))
      );
    }

    // Reset state
    setDeleteDialogOpen(false);
    setSelectedInvoices([]);
    setInvoiceToDelete(null);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Other existing functions remain the same...
  const toggleSelectInvoice = (id) => {
    setSelectedInvoices((prev) =>
      prev.includes(id)
        ? prev.filter((invoiceId) => invoiceId !== id)
        : [...prev, id]
    );
  };

  const isAllSelected =
    filteredInvoices.length > 0 &&
    selectedInvoices.length === filteredInvoices.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(filteredInvoices.map((invoice) => invoice.id));
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    const filteredData = invoices.filter((invoice) =>
      invoice.restaurantName.toLowerCase().includes(query)
    );
    setFilteredInvoices(filteredData);
    setPage(0); // Reset to first page when searching
  };

  // Get current page data
  const getCurrentPageData = () => {
    return filteredInvoices.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  };

  return (
    <Box sx={{ backgroundColor: "#FFFAE1", minHeight: "100vh" }}>
      <Header title="Orders" />

      <Stack >
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          sx={{
            margin: "5px 10px 0px 10px", // Reduce vertical margin
            padding: "5px", // Optional: Add padding for consistent spacing
          }}
        >
          {/* <Input label={"search by restaurant"} variant={'outlined'} value={searchQuery} onChange={handleSearch} style={{width:'70px', backgroundColor:'red'}} /> */}
          <input
            label={"search by restaurant"}
            value={searchQuery}
            onChange={handleSearch}
            placeholder="search by restaurant"
            style={{
              width: "100%",
              height: "30px",
              borderRadius: "4px",
              borderWidth: "1px",
              borderColor: "black",
              paddingLeft: "10px",
            }}
          />
          <Button
            variant="contained"
            color="error"
            disabled={selectedInvoices.length === 0}
            onClick={() => {
              setDeleteDialogOpen(true);
              setDeleteType("multiple");
            }}
            startIcon={<Trash2 size={20} />}
            sx={{ height: "40px" }} // Match TextField height for consistency
          >
            Delete
          </Button>
        </Stack>

        {loading ? (
          <Box display="flex" justifyContent="center" padding={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Paper
            elevation={3}
            sx={{
              backgroundColor: "white",
              borderRadius: 2,
              position: "relative",
            }}
          >
            <TableContainer sx={{ maxHeight: "calc(100vh - 100px)" }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell
                      padding="checkbox"
                      sx={{ backgroundColor: "#f5f5f5" }}
                    >
                      <Checkbox
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        indeterminate={
                          selectedInvoices.length > 0 && !isAllSelected
                        }
                      />
                    </TableCell>
                    <TableCell sx={{ backgroundColor: "#f5f5f5" }}>
                      <TableSortLabel
                        active={sortConfig.key === "id"}
                        direction={
                          sortConfig.key === "id" ? sortConfig.direction : "asc"
                        }
                        onClick={() => handleSort("id")}
                      >
                        Order ID
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ backgroundColor: "#f5f5f5" }}>
                      <TableSortLabel
                        active={sortConfig.key === "name"}
                        direction={
                          sortConfig.key === "name"
                            ? sortConfig.direction
                            : "asc"
                        }
                        onClick={() => handleSort("name")}
                      >
                        Name
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ backgroundColor: "#f5f5f5" }}>
                      <TableSortLabel
                        active={sortConfig.key === "restaurantName"}
                        direction={
                          sortConfig.key === "restaurantName"
                            ? sortConfig.direction
                            : "asc"
                        }
                        onClick={() => handleSort("restaurantName")}
                      >
                        Restaurant
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ backgroundColor: "#f5f5f5" }}>
                      <TableSortLabel
                        active={sortConfig.key === "totalPrice"}
                        direction={
                          sortConfig.key === "totalPrice"
                            ? sortConfig.direction
                            : "asc"
                        }
                        onClick={() => handleSort("totalPrice")}
                      >
                        Total Price
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ backgroundColor: "#f5f5f5" }}>
                      <TableSortLabel
                        active={sortConfig.key === "createdAt"}
                        direction={
                          sortConfig.key === "createdAt"
                            ? sortConfig.direction
                            : "asc"
                        }
                        onClick={() => handleSort("createdAt")}
                      >
                        Ordered At
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ backgroundColor: "#f5f5f5" }}>
                      Order Status
                    </TableCell>
                    <TableCell sx={{ backgroundColor: "#f5f5f5" }}>
                      Payment Status
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ backgroundColor: "#f5f5f5" }}
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getCurrentPageData().map((invoice) => (
                    <TableRow key={invoice.id} hover>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedInvoices.includes(invoice.id)}
                          onChange={() => toggleSelectInvoice(invoice.id)}
                        />
                      </TableCell>
                      <TableCell>{`#${invoice.id}`}</TableCell>
                      <TableCell>{invoice.name}</TableCell>
                      <TableCell>{invoice.restaurantName}</TableCell>
                      <TableCell>£ {invoice.totalPrice.toFixed(2)}</TableCell>
                      <TableCell>
                        {new Date(invoice.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {editingInvoiceId === invoice.id ? (
                          <Select
                            value={orderStatusValue || invoice.orderStatus}
                            onChange={(e) =>
                              handleOrderStatusChange(
                                invoice.id,
                                e.target.value
                              )
                            }
                            onBlur={() => setEditingInvoiceId(null)}
                            size="small"
                            fullWidth
                          >
                            <MenuItem value="pending">Pending</MenuItem>
                            <MenuItem value="accepted">Accepted</MenuItem>
                            <MenuItem value="shipped">Shipped</MenuItem>
                            <MenuItem value="delivered">Delivered</MenuItem>
                          </Select>
                        ) : (
                          <Box
                            sx={{
                              backgroundColor:
                                invoice.orderStatus === "pending"
                                  ? "#fdd835"
                                  : invoice.orderStatus === "delivered"
                                  ? "#66bb6a"
                                  : "#ffa726",
                              borderRadius: "8px",
                              padding: "4px 8px",
                              display: "inline-block",
                              color: "#fff",
                              fontWeight: "bold",
                              cursor: "pointer",
                            }}
                            onClick={() => setEditingInvoiceId(invoice.id)}
                          >
                            {invoice.orderStatus}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingInvoiceId === invoice.id ? (
                          <Select
                            value={
                              paymentStatusValue ||
                              (invoice.isBillPaid ? "paid" : "pending")
                            }
                            onChange={(e) =>
                              handlePaymentStatusChange(
                                invoice.id,
                                e.target.value === "paid"
                              )
                            }
                            onBlur={() => setEditingInvoiceId(null)}
                            size="small"
                            fullWidth
                          >
                            <MenuItem value="paid">Paid</MenuItem>
                            <MenuItem value="pending">Pending</MenuItem>
                          </Select>
                        ) : (
                          <Box
                            sx={{
                              backgroundColor: invoice.isBillPaid
                                ? "#66bb6a"
                                : "#ef5350",
                              borderRadius: "8px",
                              padding: "4px 8px",
                              display: "inline-block",
                              color: "#fff",
                              fontWeight: "bold",
                              cursor: "pointer",
                            }}
                            onClick={() => setEditingInvoiceId(invoice.id)}
                          >
                            {invoice.isBillPaid ? "Paid" : "Pending"}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Stack
                          direction="row"
                          spacing={1}
                          justifyContent="center"
                        >
                          <IconButton
                            color="primary"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setIsModalOpen(true);
                            }}
                          >
                            <Eye size={20} />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => {
                              setDeleteDialogOpen(true);
                              setDeleteType("single");
                              setInvoiceToDelete(invoice.id);
                            }}
                          >
                            <Trash2 size={20} />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={filteredInvoices.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[30, 50, 100]}
              sx={{
                position: "sticky",
                bottom: 0,
                backgroundColor: "white",
                borderTop: "1px solid rgba(224, 224, 224, 1)",
              }}
            />
          </Paper>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          PaperProps={{
            sx: {
              borderRadius: 2,
              padding: 1,
            },
          }}
        >
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            Are you sure you want to delete the selected invoice
            {deleteType === "multiple" ? "s" : ""}?
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button onClick={handleDelete} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {selectedInvoice && (
          <InvoiceModal
            invoice={selectedInvoice}
            handleClose={() => {
              setSelectedInvoice(null);
              setIsModalOpen(false);
            }}
            isModalOpen={isModalOpen}
          />
        )}
      </Stack>
    </Box>
  );
};

export default InvoiceScreen;
