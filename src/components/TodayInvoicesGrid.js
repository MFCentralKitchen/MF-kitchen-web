import React, { useEffect, useState } from "react";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import jsPDF from "jspdf";
import "jspdf-autotable";
import html2canvas from "html2canvas";
import {
  Paper,
  Typography,
  Box,
  Button,
  Alert,
  AlertTitle,
  CircularProgress,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import WarningIcon from "@mui/icons-material/Warning";

const theme = createTheme({
  palette: {
    primary: {
      main: "#dc2626", // red-600
    },
    secondary: {
      main: "#eab308", // yellow-500
    },
  },
});

const TodayInvoicesGrid = () => {
  const [data, setData] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const db = getFirestore();
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      // Fetch today's invoices
      const invoicesQuery = query(
        collection(db, "invoices"),
        where("createdAt", ">=", startOfDay),
        where("createdAt", "<=", endOfDay)
      );
      const invoicesSnapshot = await getDocs(invoicesQuery);
      const invoices = invoicesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // If no invoices, set empty data and return early
      if (invoices.length === 0) {
        setData([]);
        setItems([]);
        setLoading(false);
        return;
      }

      // Fetch inventory and users data
      const inventorySnapshot = await getDocs(collection(db, "inventory"));
      const usersSnapshot = await getDocs(collection(db, "users"));

      const inventory = inventorySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const users = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Get unique items from invoices
      const itemList = [];
      invoices.forEach((invoice) =>
        invoice.items.forEach((item) => {
          if (!itemList.some((i) => i.title === item.title)) {
            itemList.push(item);
          }
        })
      );
      setItems(itemList);

      // Map restaurants and item quantities
      const restaurantGrid = users.map((user) => {
        const orders = invoices.filter(
          (invoice) => invoice.restaurantName === user.restaurantName
        );

        const itemQuantities = itemList.map((item) => {
          const quantity = orders
            .flatMap((order) => order.items)
            .filter((orderItem) => orderItem.title === item.title)
            .reduce((sum, orderItem) => sum + (orderItem.quantity || 0), 0);
          return { title: item.title, quantity };
        });

        return { restaurantName: user.restaurantName, itemQuantities };
      });

      setData(restaurantGrid);
    } catch (error) {
      console.error("Error fetching data: ", error);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a3", // Ensure enough space for all columns
    });
  
    // Add the "Total" column in the header
    const headers = ["Item", ...data.map((d) => d.restaurantName), "Total"];
    const rows = [];
  
    items.forEach((item) => {
      const row = [item.title];
  
      let rowTotal = 0; // Track total for this item
  
      data.forEach((restaurant) => {
        const quantity =
          restaurant.itemQuantities.find((q) => q.title === item.title)
            ?.quantity || 0;
        row.push(quantity);
        rowTotal += quantity; // Add to total
      });
  
      row.push(rowTotal); // Add total column value
      rows.push(row);
    });
  
    // Column width calculations
    const maxRestaurantNameLength = Math.max(
      ...data.map((d) => d.restaurantName.length)
    );
    const maxItemNameLength = Math.max(...items.map((item) => item.title.length));
  
    const itemColumnWidth = Math.min(Math.max(maxItemNameLength * 2, 25), 60);
    const restaurantColumnWidth = Math.min(Math.max(maxRestaurantNameLength * 1.4, 14), 26);
    const totalColumnWidth = 30; // Fixed width for the total column
  
    // Set title
    doc.setFontSize(20);
    doc.text("Today's Invoice Grid", doc.internal.pageSize.getWidth() / 2, 15, {
      align: "center",
    });
  
    // Add timestamp
    doc.setFontSize(10);
    const timestamp = new Date().toLocaleString();
    doc.text(`Generated: ${timestamp}`, 10, 10);
  
    // Generate the table
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 25,
      styles: {
        fontSize: 9,
        cellPadding: 2,
        overflow: "linebreak",
        halign: "center",
      },
      headStyles: {
        fillColor: [220, 38, 38],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: {
        0: { cellWidth: itemColumnWidth, fontStyle: "bold", halign: "left" }, // Item column
        ...Object.fromEntries(
          Array.from({ length: data.length }, (_, i) => [
            i + 1,
            { cellWidth: restaurantColumnWidth, halign: "center" },
          ])
        ),
        [data.length + 1]: { cellWidth: totalColumnWidth, fontStyle: "bold", halign: "center" }, // Total column
      },
      didDrawPage: function (data) {
        doc.setFontSize(10);
        doc.text(
          `Page ${data.pageNumber}`,
          doc.internal.pageSize.getWidth() - 20,
          doc.internal.pageSize.getHeight() - 10
        );
      },
      margin: { top: 25, right: 15, bottom: 15, left: 15 },
      theme: "grid",
    });
  
    doc.save("todays_invoices.pdf");
  };
  

  const downloadSnapshot = async () => {
    const tableElement = document.getElementById("invoice-table");
    const canvas = await html2canvas(tableElement);
    const imageData = canvas.toDataURL("image/png");

    const link = document.createElement("a");
    link.href = imageData;
    link.download = "invoice_table_snapshot.png";
    link.click();
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={300}
      >
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!data.length) {
    return (
      <Box p={2}>
        <Alert
          severity="warning"
          icon={<WarningIcon />}
          sx={{
            "& .MuiAlert-icon": {
              color: theme.palette.primary.main,
            },
          }}
        >
          <AlertTitle>No Orders Found</AlertTitle>
          There are no orders for today. New orders will appear here as they
          come in.
        </Alert>
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Paper
        elevation={3}
        sx={{
          p: 3,
          marginLeft: "3.5%",
          marginTop: "15px",
          maxWidth: "95%", // Prevent the paper from extending beyond screen
        }}
      >
        <Typography
          variant="h4"
          color="primary"
          align="center"
          gutterBottom
          sx={{ fontWeight: "bold" }}
        >
          Today's Invoice Grid
        </Typography>

        {/* Table Container */}
        <Box
          sx={{
            width: "100%",
            overflowX: "auto",
            "&::-webkit-scrollbar": {
              height: "8px",
            },
            "&::-webkit-scrollbar-track": {
              backgroundColor: "#f1f1f1",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "#888",
              borderRadius: "4px",
            },
          }}
        >
          <table
            id="invoice-table"
            style={{
              minWidth: "100%",
              width: "max-content",
              borderCollapse: "collapse",
              borderSpacing: 0,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    position: "sticky",
                    left: 0,
                    zIndex: 2,
                    backgroundColor: theme.palette.primary.main,
                    color: "white",
                    padding: "16px",
                    border: "1px solid #ddd",
                    minWidth: { xs: "60px", sm: "150px", md: "200px" }, // Responsive width
    maxWidth: { xs: "80px", sm: "180px", md: "250px" },
                    whiteSpace: "normal", // Allow text wrapping
                    wordWrap: "break-word",
                  }}
                >
                  Item
                </th>
                {data.map((restaurant, index) => (
                  <th
                    key={index}
                    style={{
                      backgroundColor: theme.palette.primary.main,
                      color: "white",
                      padding: "16px",
                      border: "1px solid #ddd",
                      minWidth: "150px", // Fixed width for restaurant columns
                      maxWidth: "200px",
                      whiteSpace: "normal", // Allow text wrapping
                      wordWrap: "break-word",
                    }}
                  >
                    {restaurant.restaurantName}
                  </th>
                ))}
                <th
                  style={{
                    backgroundColor: theme.palette.primary.main,
                    color: "white",
                    padding: "16px",
                    border: "1px solid #ddd",
                    minWidth: "70px",
                    position: "sticky",
                    right: 0,
                    zIndex: 2,
                  }}
                >
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const total = data.reduce((sum, restaurant) => {
                  const quantity = restaurant.itemQuantities.find(
                    (q) => q.title === item.title
                  )?.quantity || 0;
                  return sum + quantity;
                }, 0);

                return (
                  <tr key={index}>
                    <td
                      style={{
                        position: "sticky",
                        left: 0,
                        backgroundColor: "white",
                        padding: "16px",
                        border: "1px solid #ddd",
                        fontWeight: "500",
                        zIndex: 1,
                        minWidth: "20px",
                        whiteSpace: "normal",
                        wordWrap: "break-word",
                      }}
                    >
                      {item.title}
                    </td>
                    {data.map((restaurant, i) => (
                      <td
                        key={i}
                        style={{
                          padding: "16px",
                          border: "1px solid #ddd",
                          textAlign: "center",
                          backgroundColor: "white",
                          minWidth: "150px",
                        }}
                      >
                        {restaurant.itemQuantities.find(
                          (q) => q.title === item.title
                        )?.quantity || "-"}
                      </td>
                    ))}
                    <td
                      style={{
                        padding: "16px",
                        border: "1px solid #ddd",
                        textAlign: "center",
                        backgroundColor: "#f0f0f0",
                        fontWeight: "bold",
                        position: "sticky",
                        right: 0,
                        zIndex: 1,
                      }}
                    >
                      {total}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td
                  style={{
                    position: "sticky",
                    left: 0,
                    backgroundColor: "#f0f0f0",
                    fontWeight: "bold",
                    padding: "16px",
                    border: "1px solid #ddd",
                    zIndex: 1,
                  }}
                >
                  Total
                </td>
                {data.map((restaurant, i) => {
                  const total = items.reduce((sum, item) => {
                    const quantity = restaurant.itemQuantities.find(
                      (q) => q.title === item.title
                    )?.quantity || 0;
                    return sum + quantity;
                  }, 0);
                  return (
                    <td
                      key={i}
                      style={{
                        padding: "16px",
                        border: "1px solid #ddd",
                        textAlign: "center",
                        backgroundColor: "#f0f0f0",
                        fontWeight: "bold",
                      }}
                    >
                      {total}
                    </td>
                  );
                })}
                <td
                  style={{
                    padding: "16px",
                    border: "1px solid #ddd",
                    textAlign: "center",
                    backgroundColor: "#e0e0e0",
                    fontWeight: "bold",
                    position: "sticky",
                    right: 0,
                    zIndex: 1,
                  }}
                >
                  {items.reduce((grandTotal, item) => {
                    const itemTotal = data.reduce((sum, restaurant) => {
                      const quantity = restaurant.itemQuantities.find(
                        (q) => q.title === item.title
                      )?.quantity || 0;
                      return sum + quantity;
                    }, 0);
                    return grandTotal + itemTotal;
                  }, 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 3 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={downloadPDF}
            sx={{ minWidth: 150 }}
          >
            Download PDF
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={downloadSnapshot}
            sx={{ minWidth: 150 }}
          >
            Download Snapshot
          </Button>
        </Box>
      </Paper>
     </ThemeProvider>
  );
};

export default TodayInvoicesGrid;
