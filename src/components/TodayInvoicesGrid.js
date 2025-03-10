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
import * as XLSX from "xlsx";

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
  
      // Fetch inventory, users, inventory items, and categories
      const [inventorySnapshot, usersSnapshot, inventoryItemsSnapshot, categoriesSnapshot] = await Promise.all([
        getDocs(collection(db, "inventory")),
        getDocs(collection(db, "users")),
        getDocs(collection(db, "inventoryItems")),
        getDocs(collection(db, "inventoryCategory")),
      ]);
  
      // Process inventory items
      const inventoryItems = inventoryItemsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
  
      // Process categories into a map { categoryId: categoryName }
      const categories = categoriesSnapshot.docs.map((doc) => ({
        id : doc.id,
        ...doc.data(),
      }));
  
      // Group items by category
      const categorizedItems = {};
  
      invoices.forEach((invoice) => {
        invoice.items.forEach((item) => {
          // Find corresponding inventory item
          const inventoryItem = inventoryItems.find(
            (invItem) => invItem.title === item.title
          );
          console.log(inventoryItem.categoryId,"TESTSTSTSST",JSON.stringify(categories),categories)
          if (!inventoryItem) return; // Skip if no matching inventory item

          const categoryItem = categories.find(
            (invItem) => invItem.id === inventoryItem.categoryId
          );
  
          const categoryName = categoryItem.category || "Uncategorized";
  
          if (!categorizedItems[categoryName]) {
            categorizedItems[categoryName] = [];
          }
  
          // Avoid duplicate items within the same category
          if (!categorizedItems[categoryName].some((i) => i.title === item.title)) {
            categorizedItems[categoryName].push(item);
          }
        });
      });
  
      // Ensure empty categories are still accounted for
      categories.forEach((category) => {
        const categoryName = category.category || "Uncategorized"; // Ensure category name is a string
        if (!categorizedItems[categoryName] || categorizedItems[categoryName].length === 0) {
          delete categorizedItems[categoryName]; // Remove empty categories
        }
      });
      
  
      // Update state ONCE with categorized items
      setItems(categorizedItems);
  
      // If no invoices, return early
      if (invoices.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }
  
      // Process restaurant-wise order data
      const users = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
  
      // Collect all unique items across invoices
      const uniqueItems = new Set();
      invoices.forEach((invoice) =>
        invoice.items.forEach((item) => uniqueItems.add(item.title))
      );
  
      const itemList = Array.from(uniqueItems).map((title) => ({ title }));
  
      // Generate restaurant-wise item quantities
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

  const downloadExcel = () => {
    const workbook = XLSX.utils.book_new();
    const worksheetData = [];
  
    // Header row
    const headers = ["Item", ...data.map((d) => d.restaurantName), "Total"];
    worksheetData.push(headers);
  
    // Iterate over categories and items
    Object.entries(items).forEach(([category, categoryItems]) => {
      // Add category row (spanning columns)
      worksheetData.push([category, ...Array(data.length + 1).fill("")]); // Empty columns after category
  
      // Add items within category
      categoryItems.forEach((item) => {
        const row = [item.title];
        let rowTotal = 0;
  
        data.forEach((restaurant) => {
          const quantity =
            restaurant.itemQuantities.find((q) => q.title === item.title)?.quantity || 0;
          row.push(quantity);
          rowTotal += quantity;
        });
  
        row.push(rowTotal); // Add total column value
        worksheetData.push(row);
      });
    });
  
    // Grand Total Row
    const totalRow = ["Total"];
    let grandTotal = 0;
  
    data.forEach((restaurant) => {
      const restaurantTotal = restaurant.itemQuantities.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
      totalRow.push(restaurantTotal);
      grandTotal += restaurantTotal;
    });
  
    totalRow.push(grandTotal);
    worksheetData.push(totalRow);
  
    // Convert to worksheet and save
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");
    XLSX.writeFile(workbook, "todays_invoices.xlsx");
  };
  


  const downloadPDF = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a3",
    });
  
    const headers = ["Item", ...data.map((d) => d.restaurantName), "Total"];
    const rows = [];
  
    // Fix: Loop over Object.values(items) instead of items
    Object.values(items).forEach((categoryItems) => {
      categoryItems.forEach((item) => {
        const row = [item.title];
        let rowTotal = 0;
  
        data.forEach((restaurant) => {
          const quantity =
            restaurant.itemQuantities.find((q) => q.title === item.title)
              ?.quantity || 0;
          row.push(quantity);
          rowTotal += quantity;
        });
  
        row.push(rowTotal);
        rows.push(row);
      });
    });
  
    doc.setFontSize(20);
    doc.text("Today's Invoice Grid", doc.internal.pageSize.getWidth() / 2, 15, {
      align: "center",
    });
  
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 25,
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
console.log(JSON.stringify(items),"ITEMSSSS")
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
  {Object.entries(items).map(([category, categoryItems], catIndex) => (
    <React.Fragment key={catIndex}>
      {/* Category Divider */}
      <tr>
        <td
          colSpan={data.length + 2}
          style={{
            backgroundColor: "#f8f9fa",
            fontWeight: "bold",
            textAlign: "left",
            padding: "10px",
            border: "1px solid #ddd",
            position: "sticky",
            top: 0,
            zIndex: 2,
          }}
        >
          {category}
        </td>
      </tr>

      {/* Render Items in Category */}
      {categoryItems.map((item, index) => {
        const total = data.reduce((sum, restaurant) => {
          const quantity =
            restaurant.itemQuantities.find((q) => q.title === item.title)?.quantity || 0;
          return sum + quantity;
        }, 0);

        return (
          <tr key={index}>
            {/* Sticky Item Column */}
            <td
              style={{
                padding: "16px",
                border: "1px solid #ddd",
                fontWeight: "500",
                position: "sticky",
                left: 0,
                backgroundColor: "#fff",
                zIndex: 1,
              }}
            >
              {item.title}
            </td>

            {/* Restaurant Data */}
            {data.map((restaurant, i) => (
              <td key={i} style={{ padding: "16px", border: "1px solid #ddd", textAlign: "center" }}>
                {restaurant.itemQuantities.find((q) => q.title === item.title)?.quantity || "-"}
              </td>
            ))}

            {/* Sticky Total Column */}
            <td
              style={{
                padding: "16px",
                border: "1px solid #ddd",
                fontWeight: "bold",
                textAlign: "center",
                position: "sticky",
                right: 0,
                backgroundColor: "#fff",
                zIndex: 1,
              }}
            >
              {total}
            </td>
          </tr>
        );
      })}
    </React.Fragment>
  ))}

  {/* Grand Total Row */}
  <tr style={{ backgroundColor: "#f1f1f1", fontWeight: "bold" }}>
    <td
      style={{
        padding: "16px",
        border: "1px solid #ddd",
        position: "sticky",
        left: 0,
        backgroundColor: "#fff",
        zIndex: 2,
      }}
    >
      Total
    </td>

    {data.map((restaurant, i) => {
      const grandTotal = restaurant.itemQuantities.reduce((sum, item) => sum + item.quantity, 0);
      return (
        <td key={i} style={{ padding: "16px", border: "1px solid #ddd", textAlign: "center" }}>
          {grandTotal}
        </td>
      );
    })}

    <td
      style={{
        padding: "16px",
        border: "1px solid #ddd",
        fontWeight: "bold",
        textAlign: "center",
        position: "sticky",
        right: 0,
        backgroundColor: "#fff",
        zIndex: 2,
      }}
    >
      {data.reduce((sum, restaurant) => sum + restaurant.itemQuantities.reduce((s, i) => s + i.quantity, 0), 0)}
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
          {/* <Button
            variant="contained"
            color="secondary"
            onClick={downloadSnapshot}
            sx={{ minWidth: 150 }}
          >
            Download Snapshot
          </Button> */}
          <Button
  variant="contained"
  color="secondary"
  onClick={downloadExcel}
  sx={{ minWidth: 150 }}
>
  Download Excel
</Button>

        </Box>
      </Paper>
    </ThemeProvider>
  );
};

export default TodayInvoicesGrid;
