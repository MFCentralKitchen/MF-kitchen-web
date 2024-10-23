import React, { useEffect, useState } from "react";
import { collection, onSnapshot , doc, updateDoc } from "firebase/firestore";
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
  MenuItem,
  Select,
} from "@mui/material";
import InvoiceModal from "../components/invoice-modal";
import Header from "../components/header";
import { format } from "date-fns";

const InvoiceScreen = () => {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [orderStatusValue, setOrderStatusValue] = useState(""); // Local state for order status
  const [paymentStatusValue, setPaymentStatusValue] = useState(""); 

  const isMobile = useMediaQuery("(max-width:600px)");

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "invoices"), (snapshot) => {
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

  const handleOrderStatusBlur = async (invoiceId) => {
    if (orderStatusValue) {
      await handleStatusChange(invoiceId, "orderStatus", orderStatusValue);
    }
    setEditingInvoiceId(null); // Exit edit mode
  };
  
  const handlePaymentStatusBlur = async (invoiceId) => {
    if (paymentStatusValue) {
      await handleStatusChange(invoiceId, "isBillPaid", paymentStatusValue === "paid");
    }
    setEditingInvoiceId(null); // Exit edit mode
  };

  const handleSort = (column) => {
    const direction =
      sortConfig.key === column && sortConfig.direction === "asc"
        ? "desc"
        : "asc";
    const sortedInvoices = [...filteredInvoices].sort((a, b) => {
      if (a[column] < b[column]) return direction === "asc" ? -1 : 1;
      if (a[column] > b[column]) return direction === "asc" ? 1 : -1;
      return 0;
    });
    setFilteredInvoices(sortedInvoices);
    setSortConfig({ key: column, direction });
  };

  const handleStatusChange = async (invoiceId, field, newValue) => {
    const invoiceRef = doc(db, "invoices", invoiceId);
    await updateDoc(invoiceRef, { [field]: newValue });
  };

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    const filteredData = invoices.filter((invoice) =>
      invoice.restaurantName.toLowerCase().includes(query)
    );
    setFilteredInvoices(filteredData);
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    const validDate = new Date(date.seconds ? date.seconds * 1000 : date);
    return isNaN(validDate) ? "N/A" : format(validDate, "dd/MM/yyyy");
  };

  return (
    <div style={{ backgroundColor: "#FFFAE1"}}>
      <Header title="Invoices" />

      <div style={{ marginBottom: "20px",marginTop:'10px' }}>
        <TextField
          label="Search by Restaurant"
          variant="outlined"
          fullWidth
          value={searchQuery}
          onChange={handleSearch}
        />
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
          <CircularProgress />
        </div>
      ) : (
        <TableContainer component={Paper} style={{ overflowX: 'auto',backgroundColor:'#FFFAE1' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={sortConfig.key === "id"}
                    direction={sortConfig.direction}
                    onClick={() => handleSort("id")}
                  >
                    Order ID
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortConfig.key === "name"}
                    direction={sortConfig.direction}
                    onClick={() => handleSort("name")}
                  >
                    Name
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortConfig.key === "restaurantName"}
                    direction={sortConfig.direction}
                    onClick={() => handleSort("restaurantName")}
                  >
                    Restaurant
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortConfig.key === "totalPrice"}
                    direction={sortConfig.direction}
                    onClick={() => handleSort("totalPrice")}
                  >
                    Total Price
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortConfig.key === "createdAt"}
                    direction={sortConfig.direction}
                    onClick={() => handleSort("createdAt")}
                  >
                    Ordered At
                  </TableSortLabel>
                </TableCell>

                <TableCell>Order Status</TableCell>
                <TableCell>Payment Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>{`#${invoice.id}`}</TableCell>
                  <TableCell>{invoice.name}</TableCell>
                  <TableCell>{invoice.restaurantName}</TableCell>
                  <TableCell>£ {invoice.totalPrice}</TableCell>
                  <TableCell>{formatDate(invoice.createdAt)}</TableCell>
                  {/* Editable Order Status */}
                  <TableCell>
                    {editingInvoiceId === invoice.id ? (
                      <Select
                        value={invoice.orderStatus}
                        onChange={(e) =>
                          handleStatusChange(invoice.id, "orderStatus", e.target.value)
                        }
                        onBlur={() => handleOrderStatusBlur(invoice.id)}
                        displayEmpty
                        variant="outlined"
                        fullWidth
                      >
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="accepted">Accepted</MenuItem>
                        <MenuItem value="shipped">Shipped</MenuItem>
                        <MenuItem value="delivered">Delivered</MenuItem>
                      </Select>
                    ) : (
                      <div
                        style={{
                          backgroundColor:
                            invoice.orderStatus === "pending"
                              ? "#fdd835"
                              : invoice.orderStatus === "delivered"
                              ? "#66bb6a"
                              : "#ffa726",
                          borderRadius: "8px",
                          padding: "4px 8px",
                          textAlign: "center",
                          display: "inline-block",
                          color: "#fff",
                          fontWeight: "bold",
                          minWidth: "80px",
                          cursor: "pointer",
                        }}
                        onClick={() => setEditingInvoiceId(invoice.id)}
                      >
                        {invoice.orderStatus}
                      </div>
                    )}
                  </TableCell>
                  {/* Editable Payment Status */}
                  <TableCell>
                    {editingInvoiceId === invoice.id ? (
                      <Select
                        value={invoice.isBillPaid ? "paid" : "pending"}
                        onChange={(e) =>
                          handleStatusChange(invoice.id, "isBillPaid", e.target.value === "paid")
                        }
                        onBlur={() => handlePaymentStatusBlur(invoice.id)}
                        displayEmpty
                        variant="outlined"
                        fullWidth
                      >
                        <MenuItem value="paid">Paid</MenuItem>
                        <MenuItem value="pending">Pending</MenuItem>
                      </Select>
                    ) : (
                      <div
                        style={{
                          backgroundColor: invoice.isBillPaid ? "#66bb6a" : "#ef5350",
                          borderRadius: "8px",
                          padding: "4px 8px",
                          textAlign: "center",
                          display: "inline-block",
                          color: "#fff",
                          fontWeight: "bold",
                          minWidth: "80px",
                          cursor: "pointer",
                        }}
                        onClick={() => setEditingInvoiceId(invoice.id)}
                      >
                        {invoice.isBillPaid ? "Paid" : "Pending"}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="contained" color="primary" onClick={() => setSelectedInvoice(invoice)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {selectedInvoice && (
        <InvoiceModal
          invoice={selectedInvoice}
          handleClose={() => setSelectedInvoice(null)}
          isModalOpen={selectedInvoice}
        />
      )}
    </div>
  );
};

export default InvoiceScreen;
