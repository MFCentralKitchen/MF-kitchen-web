import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
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
} from "@mui/material";
import InvoiceModal from "../components/invoice-modal";
import LOGO from "../assets/MF-CPU-LOGO.png";
import Header from "../components/header";

const InvoiceScreen = () => {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]); // For filtered data
  const [selectedInvoice, setSelectedInvoice] = useState(null); // To track which invoice to open in the modal
  const [loading, setLoading] = useState(true); // Loader state
  const [searchQuery, setSearchQuery] = useState(""); // For search filter
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' }); // Sorting state

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "invoices"), (snapshot) => {
      const invoiceData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setInvoices(invoiceData);
      setFilteredInvoices(invoiceData);
      setLoading(false); // Disable loader when data is fetched
    });

    return () => unsubscribe();
  }, []);

  // Sorting functionality
  const handleSort = (column) => {
    const direction = sortConfig.key === column && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    const sortedInvoices = [...filteredInvoices].sort((a, b) => {
      if (a[column] < b[column]) return direction === 'asc' ? -1 : 1;
      if (a[column] > b[column]) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setFilteredInvoices(sortedInvoices);
    setSortConfig({ key: column, direction });
  };

  // Search functionality
  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    const filteredData = invoices.filter((invoice) =>
      invoice.restaurantName.toLowerCase().includes(query)
    );
    setFilteredInvoices(filteredData);
  };

  return (
    <div>
      <Header title='Invoices'/>
      
      <div style={{ padding: '20px' }}>
        <TextField
          label="Search by Restaurant"
          variant="outlined"
          fullWidth
          value={searchQuery}
          onChange={handleSearch}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
          <CircularProgress />
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.key === 'name'}
                  direction={sortConfig.direction}
                  onClick={() => handleSort('name')}
                >
                  Name
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.key === 'restaurantName'}
                  direction={sortConfig.direction}
                  onClick={() => handleSort('restaurantName')}
                >
                  Restaurant
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortConfig.key === 'totalPrice'}
                  direction={sortConfig.direction}
                  onClick={() => handleSort('totalPrice')}
                >
                  Total Price
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
                <TableCell>{invoice.name}</TableCell>
                <TableCell>{invoice.restaurantName}</TableCell>
                <TableCell>{invoice.totalPrice}</TableCell>
                <TableCell>
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
                      minWidth: "80px"
                    }}
                  >
                    {invoice.orderStatus}
                  </div>
                </TableCell>
                <TableCell>
                  <div
                    style={{
                      backgroundColor: invoice.isBillPaid ? "#66bb6a" : "#ef5350",
                      borderRadius: "8px",
                      padding: "4px 8px",
                      textAlign: "center",
                      display: "inline-block",
                      color: "#fff",
                      fontWeight: "bold",
                      minWidth: "80px"
                    }}
                  >
                    {invoice.isBillPaid ? "Paid" : "Pending"}
                  </div>
                </TableCell>
                <TableCell>
                  <Button onClick={() => setSelectedInvoice(invoice)}>
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
