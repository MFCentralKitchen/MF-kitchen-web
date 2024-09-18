import React, { useState, useRef, useEffect } from "react";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase-config";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableContainer,
  TableHead,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  TextField,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import html2pdf from "html2pdf.js";
import LOGO from "../assets/MF-CPU-LOGO.png";

const InvoiceModal = ({ invoice, isModalOpen, handleClose }) => {
  const [editableInvoice, setEditableInvoice] = useState(invoice);
  const [editingIndex, setEditingIndex] = useState(null); // Index of the item being edited
  const [inputValue, setInputValue] = useState(""); // Price input state
  const [showDropdown, setShowDropdown] = useState(false);
  const invoiceRef = useRef();

  useEffect(() => {
    // Update editableInvoice when invoice prop changes
    setEditableInvoice(invoice);
  }, [invoice]);

  useEffect(() => {
    if (editingIndex !== null) {
      setInputValue(editableInvoice.items[editingIndex].price);
    }
  }, [editingIndex, editableInvoice]);

  const handleStatusChange = (field, value) => {
    setEditableInvoice((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Update the total price of the invoice
  const updateTotalPrice = () => {
    const totalPrice = editableInvoice.items.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);
    setEditableInvoice((prev) => ({
      ...prev,
      totalPrice,
    }));
  };

  const handleSave = async () => {
    setShowDropdown(true);
    const invoiceDocRef = doc(db, "invoices", editableInvoice.id);
    try {
      await updateDoc(invoiceDocRef, editableInvoice);
      alert("Invoice updated successfully!");
      handleClose(); // Close the modal after saving
    } catch (err) {
      console.error("Error updating invoice: ", err);
    }
  };

  const handleSendInvoice = () => {
    // Ensures the state has been updated before generating the PDF
    setShowDropdown(true);
    setTimeout(() => {
      const element = invoiceRef.current;
      const options = {
        margin: [0.5, 0.5],
        filename: `Invoice_${editableInvoice.id}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
      };

      // Clone the element
      const clone = element.cloneNode(true);

      // Hide edit icons
      const editIcons = clone.querySelectorAll(".edit-icon");
      editIcons.forEach((icon) => (icon.style.display = "none"));

      // Replace dropdowns with text in the cloned element
      const dropdowns = clone.querySelectorAll("select");
      dropdowns.forEach((dropdown) => {
        const selectedValue = dropdown.options[dropdown.selectedIndex].text;
        const span = document.createElement("span");
        span.textContent = selectedValue;
        dropdown.parentNode.replaceChild(span, dropdown);
      });

      // Generate PDF
      html2pdf().from(clone).set(options).save();
    }, 100); // Delay to ensure state is updated
  };

  const handlePriceChange = (index, value) => {
    const newItems = [...editableInvoice.items];
    newItems[index].price = parseFloat(value);
    setEditableInvoice((prev) => ({
      ...prev,
      items: newItems,
    }));
    updateTotalPrice();
  };

  const handleBlur = () => {
    if (editingIndex !== null) {
      handlePriceChange(editingIndex, inputValue);
      setEditingIndex(null); // Hide input field
    }
  };

  return (
    <Dialog open={isModalOpen} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogContent>
        {/* Wrapping the entire invoice content */}
        <div
          ref={invoiceRef}
          style={{ paddingLeft: "50px", paddingRight: "50px" }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <DialogTitle style={{ fontSize: 40, marginLeft: -25 }}>
              Invoice
            </DialogTitle>
            <img
              src={LOGO}
              alt="Company Logo"
              style={{ width: "150px", marginRight: "40px" }}
            />
          </div>

          {/* Customer and Invoice Details */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "16px",
              marginTop: 20,
            }}
          >
            <div style={{ width: "45%" }}>
              <strong>Bill From:</strong>{" "}
              <strong style={{ fontSize: 18 }}>Central Kitchen,</strong> UNIT 5,
              152 High Street, Hounslow , TW3 1LR
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <div style={{ width: "45%" }}>
              <strong>Bill To:</strong> {editableInvoice.address}
            </div>
            <div style={{ width: "45%" }}>
              <strong>Invoice date:</strong>{" "}
              {new Date().toISOString().split("T")[0]}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <div style={{ width: "45%" }}>
              <strong>Name:</strong> {editableInvoice.name}
            </div>
            <div style={{ width: "45%" }}>
              <strong>Restaurant Name:</strong> {editableInvoice.restaurantName}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <div style={{ width: "45%" }}>
              <strong>Email:</strong> {editableInvoice.email}
            </div>
            <div style={{ width: "45%", marginBottom: 25 }}>
              <strong>Phone:</strong> {editableInvoice.phone}
            </div>
          </div>

          {/* Items Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Brand</TableCell>
                  <TableCell>Price/unit</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Units</TableCell>
                  <TableCell>Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {editableInvoice.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.title}</TableCell>
                    <TableCell>{item.brand}</TableCell>
                    <TableCell>
                      {editingIndex === index ? (
                        <TextField
                          autoFocus
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onBlur={handleBlur}
                          onFocus={() => setInputValue(item.price)}
                          type="number"
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        <>
                          {item.price}
                          <IconButton
                            size="small"
                            className="edit-icon"
                            onClick={() => setEditingIndex(index)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.units}</TableCell>
                    <TableCell>{item.price * item.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Order and Payment Status */}
          {showDropdown ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "16px",
              }}
            >
              <div style={{ width: "45%" }}>
                <strong>Order Status:</strong> {editableInvoice.orderStatus}
              </div>
              <div style={{ width: "45%" }}>
                <strong>Payment Status:</strong> {editableInvoice.paymentStatus}
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "16px",
              }}
            >
              <FormControl fullWidth>
                <InputLabel id="order-status-label">Order Status</InputLabel>
                <Select
                  labelId="order-status-label"
                  value={editableInvoice.orderStatus}
                  onChange={(e) => handleStatusChange("orderStatus", e.target.value)}
                >
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="payment-status-label">Payment Status</InputLabel>
                <Select
                  labelId="payment-status-label"
                  value={editableInvoice.paymentStatus}
                  onChange={(e) => handleStatusChange("paymentStatus", e.target.value)}
                >
                  <MenuItem value="Unpaid">Unpaid</MenuItem>
                  <MenuItem value="Paid">Paid</MenuItem>
                </Select>
              </FormControl>
            </div>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "16px",
              fontWeight: "bold",
              borderTop: "2px solid #000",
              paddingTop: "8px",
            }}
          >
            <div>Total Items:</div>
            <div>${editableInvoice.totalPrice.toFixed(2)}</div>
          </div>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        <Button onClick={handleSave}>Save</Button>
        <Button onClick={handleSendInvoice}>Send Invoice</Button>
      </DialogActions>
    </Dialog>
  );
};

export default InvoiceModal;
