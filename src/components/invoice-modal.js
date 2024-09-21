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
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import html2pdf from "html2pdf.js";
import LOGO from "../assets/MF-CPU-LOGO.png";

const InvoiceModal = ({ invoice, isModalOpen, handleClose }) => {
  const [editableInvoice, setEditableInvoice] = useState(invoice);
  const [editingIndex, setEditingIndex] = useState(null); // Index of the item being edited
  const [inputValue, setInputValue] = useState(""); // For editing price and quantity
  const [editField, setEditField] = useState(null); // Field being edited (price, quantity, etc.)
  const [showDropdown, setShowDropdown] = useState(false);
  const invoiceRef = useRef();

  useEffect(() => {
    setEditableInvoice(invoice); // Update when invoice prop changes
  }, [invoice]);

  const handleStatusChange = (field, value) => {
    setEditableInvoice((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

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
    setShowDropdown(true);
    setTimeout(() => {
      const element = invoiceRef.current;
      const options = {
        margin: [0.5, 0.5],
        filename: `Invoice_${editableInvoice.id}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
      };
      const clone = element.cloneNode(true);
      const editIcons = clone.querySelectorAll(".edit-icon");
      editIcons.forEach((icon) => (icon.style.display = "none"));

      const dropdowns = clone.querySelectorAll("select");
      dropdowns.forEach((dropdown) => {
        const selectedValue = dropdown.options[dropdown.selectedIndex].text;
        const span = document.createElement("span");
        span.textContent = selectedValue;
        dropdown.parentNode.replaceChild(span, dropdown);
      });

      html2pdf().from(clone).set(options).save();
    }, 100);
  };

  const handleEditField = (field, index, value) => {
    const newItems = [...editableInvoice.items];
    newItems[index][field] = value;
    setEditableInvoice((prev) => ({
      ...prev,
      items: newItems,
    }));
    updateTotalPrice(); // Recalculate total
  };

  const handleBlur = () => {
    if (editingIndex !== null) {
      handleEditField(editField, editingIndex, inputValue);
      setEditingIndex(null); // Hide input field
      setEditField(null);
    }
  };

  return (
    <Dialog open={isModalOpen} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogContent>
        <div
          ref={invoiceRef}
          style={{ paddingLeft: "50px", paddingRight: "50px" }}
        >
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
              <strong>Bill From:</strong> Central Kitchen, UNIT 5, 152 High
              Street, Hounslow , TW3 1LR
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
                  <TableCell>Price (£/unit)</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Units</TableCell>
                  <TableCell>Total (£)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {editableInvoice.items.map((item, index) => (
                  <TableRow key={index}>
                    {/* Editable Title */}
                    <TableCell>
                      {editingIndex === index && editField === "title" ? (
                        <TextField
                          autoFocus
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onBlur={handleBlur}
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        <>
                          {item.title}
                          <IconButton
                            size="small"
                            className="edit-icon"
                            onClick={() => {
                              setEditingIndex(index);
                              setEditField("title");
                              setInputValue(item.title);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </TableCell>

                    {/* Editable Brand */}
                    <TableCell>
                      {editingIndex === index && editField === "brand" ? (
                        <TextField
                          autoFocus
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onBlur={handleBlur}
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        <>
                          {item.brand}
                          <IconButton
                            size="small"
                            className="edit-icon"
                            onClick={() => {
                              setEditingIndex(index);
                              setEditField("brand");
                              setInputValue(item.brand);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </TableCell>

                    {/* Editable Price */}
                    <TableCell>
                      {editingIndex === index && editField === "price" ? (
                        <TextField
                          autoFocus
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onBlur={handleBlur}
                          type="number"
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        <>
                          £{item.price}
                          <IconButton
                            size="small"
                            className="edit-icon"
                            onClick={() => {
                              setEditingIndex(index);
                              setEditField("price");
                              setInputValue(item.price);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </TableCell>

                    {/* Editable Quantity */}
                    <TableCell>
                      {editingIndex === index && editField === "quantity" ? (
                        <TextField
                          autoFocus
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onBlur={handleBlur}
                          type="number"
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        <>
                          {item.quantity}
                          <IconButton
                            size="small"
                            className="edit-icon"
                            onClick={() => {
                              setEditingIndex(index);
                              setEditField("quantity");
                              setInputValue(item.quantity);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </TableCell>

                    {/* Editable Units */}
                    <TableCell>
                      {editingIndex === index && editField === "units" ? (
                        <TextField
                          autoFocus
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onBlur={handleBlur}
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        <>
                          {item.units}
                          <IconButton
                            size="small"
                            className="edit-icon"
                            onClick={() => {
                              setEditingIndex(index);
                              setEditField("units");
                              setInputValue(item.units);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </TableCell>

                    {/* Item Total Price */}
                    <TableCell>£{item.price * item.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {/* Order and Payment Status Dropdowns */}
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
                width: "100%",
              }}
            >
              <FormControl fullWidth>
                <InputLabel id="order-status-label">Order Status</InputLabel>
                <Select
                  labelId="order-status-label"
                  value={editableInvoice.orderStatus}
                  onChange={(e) =>
                    handleStatusChange("orderStatus", e.target.value)
                  }
                >
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="payment-status-label">
                  Payment Status
                </InputLabel>
                <Select
                  labelId="payment-status-label"
                  value={editableInvoice.paymentStatus}
                  onChange={(e) =>
                    handleStatusChange("paymentStatus", e.target.value)
                  }
                >
                  <MenuItem value="Unpaid">Unpaid</MenuItem>
                  <MenuItem value="Paid">Paid</MenuItem>
                </Select>
              </FormControl>
            </div>
          )}

          {/* Total Items */}
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
            <div>£{editableInvoice.totalPrice.toFixed(2)}</div>
          </div>
        </div>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleSave}>Save</Button>
        <Button onClick={handleSendInvoice}>Send Invoice</Button>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default InvoiceModal;
