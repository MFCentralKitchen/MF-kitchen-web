import React, { useState, useRef } from "react";
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
} from "@mui/material";
import html2pdf from "html2pdf.js";
import LOGO from "../assets/MF-CPU-LOGO.png";

const InvoiceModal = ({ invoice, isModalOpen, handleClose }) => {
  const [editableInvoice, setEditableInvoice] = useState(invoice);
  const [showDropdowns, setShowDropdowns] = useState(true); // State to control dropdown visibility
  const invoiceRef = useRef();

  const handleSave = async () => {
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
    const element = invoiceRef.current;
    const options = {
      margin: [0.5, 0.5],
      filename: `Invoice_${editableInvoice.id}.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    };

    html2pdf().from(element).set(options).save();
    setShowDropdowns(false); // Hide dropdowns after sending the invoice
  };

  // Handle dropdown changes
  const handleStatusChange = (field, value) => {
    setEditableInvoice((prev) => ({
      ...prev,
      [field]: value,
    }));
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
                    <TableCell>{item.price}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.units}</TableCell>
                    <TableCell>{item.price * item.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Order and Payment Status */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "16px",
            }}
          >
            {showDropdowns ? (
              <FormControl fullWidth>
                <InputLabel>Order Status</InputLabel>
                <Select
                  value={editableInvoice.orderStatus}
                  onChange={(e) =>
                    handleStatusChange("orderStatus", e.target.value)
                  }
                >
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Shipped">Shipped</MenuItem>
                  <MenuItem value="Delivered">Delivered</MenuItem>
                </Select>
              </FormControl>
            ) : (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "8px",
                  width:"100%"
                }}
              >
                <Typography variant="body1">
                  <strong>Order Status:</strong>
                </Typography>
                <Typography variant="body1">
                  <strong>{editableInvoice.orderStatus}</strong>
                </Typography>
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "8px",
              width:"100%"
            }}
          >
            {showDropdowns ? (
              <FormControl fullWidth>
                <InputLabel>Payment Status</InputLabel>
                <Select
                  value={editableInvoice.isBillPaid ? "Paid" : "Pending"}
                  onChange={(e) =>
                    handleStatusChange("isBillPaid", e.target.value === "Paid")
                  }
                >
                  <MenuItem value="Paid">Paid</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
                </Select>
              </FormControl>
            ) : (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "8px",
                  width:"100%"
                }}
              >
                <Typography variant="body1">
                  <strong>Payment Status:</strong>
                </Typography>
                <Typography variant="body1">
                  <strong>
                    {editableInvoice.isBillPaid ? "Paid" : "Pending"}
                  </strong>
                </Typography>
              </div>
            )}
          </div>

          {/* Total Price */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "8px",
            }}
          >
            <Typography variant="body1">
              <strong>Total Price:</strong>
            </Typography>
            <Typography variant="body1">
              <strong>{editableInvoice.totalPrice}</strong>
            </Typography>
          </div>
        </div>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleSave} color="primary" variant="contained">
          Save
        </Button>
        <Button
          onClick={handleSendInvoice}
          color="secondary"
          variant="contained"
        >
          Send Invoice
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InvoiceModal;
