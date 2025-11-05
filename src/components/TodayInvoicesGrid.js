import React, { useEffect, useState, useCallback } from "react";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  getDocs
} from "firebase/firestore";
import { DateTime } from "luxon";
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
  IconButton,
  Tooltip
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import WarningIcon from "@mui/icons-material/Warning";
import RefreshIcon from "@mui/icons-material/Refresh";
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
  const [items, setItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Get UK timezone date range
  const getUKDateRange = () => {
    const now = DateTime.now().setZone("Europe/London");
    const startOfDay = now.startOf("day");
    const endOfDay = now.endOf("day");

    return {
      start: startOfDay.toISO(),
      end: endOfDay.toISO()
    };
  };

  // Process fetched data
  const processData = useCallback(async (invoices, db) => {
    try {
      // Fetch all necessary collections in parallel
      const [
        inventoryItemsSnapshot,
        categoriesSnapshot,
        usersSnapshot
      ] = await Promise.all([
        getDocs(collection(db, "inventoryItems")),
        getDocs(collection(db, "inventoryCategory")),
        getDocs(collection(db, "users"))
      ]);

      // Process data into maps for quick lookup
      const inventoryItems = inventoryItemsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const categories = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Process categorized items
      const categorizedItems = {};
      const uniqueItems = new Set();

      invoices.forEach(invoice => {
        invoice.items.forEach(item => {
          uniqueItems.add(item.title);

          const inventoryItem = inventoryItems.find(
            invItem => invItem.title === item.title
          );
          if (!inventoryItem) return;

          const category = categories.find(
            cat => cat.id === inventoryItem.categoryId
          );
          const categoryName = category?.category || "Uncategorized";

          if (!categorizedItems[categoryName]) {
            categorizedItems[categoryName] = [];
          }

          if (!categorizedItems[categoryName].some(i => i.title === item.title)) {
            categorizedItems[categoryName].push(item);
          }
        });
      });

      // Process restaurant-wise data
      const itemList = Array.from(uniqueItems).map(title => ({ title }));
      const restaurantGrid = users.map(user => {
        const orders = invoices.filter(
          invoice => invoice.restaurantName === user.restaurantName
        );

        const itemQuantities = itemList.map(item => {
          const quantity = orders
            .flatMap(order => order.items)
            .filter(orderItem => orderItem.title === item.title)
            .reduce((sum, orderItem) => sum + (Number(orderItem.quantity) || 0), 0); // Ensure number
          return { title: item.title, quantity: Number(quantity) }; // Ensure number
        });

        return { restaurantName: user.restaurantName, itemQuantities };
      });

      return { categorizedItems, restaurantGrid };
    } catch (err) {
      console.error("Error processing data:", err);
      throw err;
    }
  }, []);

  // Fetch data with real-time updates
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const db = getFirestore();
      const { start, end } = getUKDateRange();

      // Query for today's invoices in UK time
      const invoicesQuery = query(
        collection(db, "invoices"),
        where("createdAt", ">=", start),
        where("createdAt", "<=", end)
      );

      // Set up real-time listener
      const unsubscribe = onSnapshot(invoicesQuery, async (snapshot) => {
        const invoices = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        if (invoices.length === 0) {
          setData([]);
          setItems({});
          setLoading(false);
          setLastUpdated(new Date());
          return;
        }

        try {
          const { categorizedItems, restaurantGrid } = await processData(invoices, db);
          setItems(categorizedItems);
          setData(restaurantGrid);
          setLastUpdated(new Date());
        } catch (err) {
          setError("Failed to process data. Please try again.");
          console.error("Processing error:", err);
        } finally {
          setLoading(false);
        }
      });

      return () => unsubscribe();
    } catch (err) {
      setError("Failed to fetch data. Please try again.");
      console.error("Fetch error:", err);
      setLoading(false);
    }
  }, [processData]);

  // Manual refresh
  const handleRefresh = async () => {
    try {
      setLoading(true);
      await fetchData();
    } catch (err) {
      setError("Refresh failed. Please try again.");
      console.error("Refresh error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Initialize data fetching
  useEffect(() => {
    const unsubscribePromise = fetchData();

    return () => {
      unsubscribePromise.then(unsubscribe => {
        if (unsubscribe && typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    };
  }, [fetchData]);

  const downloadExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();
      const worksheetData = [];

      // Header row
      const headers = ["Item", ...data.map(d => d.restaurantName), "Total"];
      worksheetData.push(headers);

      // Add categories and items
      Object.entries(items).forEach(([category, categoryItems]) => {
        worksheetData.push([category, ...Array(data.length + 1).fill("")]);

        categoryItems.forEach(item => {
          const row = [item.title];
          let rowTotal = 0;

          data.forEach(restaurant => {
            const quantity = restaurant.itemQuantities.find(
              q => q.title === item.title
            )?.quantity || 0;
            row.push(quantity);
            rowTotal += quantity;
          });

          row.push(rowTotal);
          worksheetData.push(row);
        });
      });

      // Grand Total Row
      const totalRow = ["Total"];
      let grandTotal = 0;

      data.forEach(restaurant => {
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
      XLSX.writeFile(workbook, `todays_invoices_${new Date().toISOString()}.xlsx`);
    } catch (err) {
      setError("Failed to generate Excel file");
      console.error("Excel generation error:", err);
    }
  };

  const downloadPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a3",
      });

      const headers = ["Item", ...data.map(d => d.restaurantName), "Total"];
      const rows = [];

      Object.entries(items).forEach(([category, categoryItems]) => {
        // Add category header
        rows.push([category, ...Array(headers.length - 1).fill("")]);

        // Add items
        categoryItems.forEach(item => {
          const row = [item.title];
          let rowTotal = 0;

          data.forEach(restaurant => {
            const quantity = restaurant.itemQuantities.find(
              q => q.title === item.title
            )?.quantity || 0;
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

      // Add last updated time
      doc.setFontSize(10);
      doc.text(
        `Last updated: ${lastUpdated?.toLocaleString() || "Unknown"}`,
        10,
        25
      );

      doc.autoTable({
        head: [headers],
        body: rows,
        startY: 30,
        theme: "grid",
        headStyles: {
          fillColor: [220, 38, 38] // red-600
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250] // light gray
        }
      });

      doc.save(`todays_invoices_${new Date().toISOString()}.pdf`);
    } catch (err) {
      setError("Failed to generate PDF");
      console.error("PDF generation error:", err);
    }
  };

  const downloadSnapshot = async () => {
    try {
      const tableElement = document.getElementById("invoice-table");
      const canvas = await html2canvas(tableElement);
      const imageData = canvas.toDataURL("image/png");

      const link = document.createElement("a");
      link.href = imageData;
      link.download = `invoice_table_${new Date().toISOString()}.png`;
      link.click();
    } catch (err) {
      setError("Failed to capture snapshot");
      console.error("Snapshot error:", err);
    }
  };

  if (loading && !lastUpdated) {
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

  if (error) {
    return (
      <Box p={2}>
        <Alert severity="error">
          <AlertTitle>Error</AlertTitle>
          {error}
          <Box mt={2}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleRefresh}
              startIcon={<RefreshIcon />}
            >
              Retry
            </Button>
          </Box>
        </Alert>
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
          <Box mt={2}>
            <Button
              variant="outlined"
              color="primary"
              onClick={handleRefresh}
              startIcon={<RefreshIcon />}
            >
              Refresh
            </Button>
          </Box>
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
          maxWidth: "95%",
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography
            variant="h4"
            color="primary"
            gutterBottom
            sx={{ fontWeight: "bold" }}
          >
            Today's Invoice Grid
          </Typography>

          <Box display="flex" alignItems="center" gap={1}>
            {lastUpdated && (
              <Typography variant="caption" color="textSecondary">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </Typography>
            )}
            <Tooltip title="Refresh data">
              <IconButton onClick={handleRefresh} color="primary">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

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
                    minWidth: "150px",
                    maxWidth: "250px",
                    whiteSpace: "normal",
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
                      minWidth: "150px",
                      maxWidth: "200px",
                      whiteSpace: "normal",
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
              {Object.entries(items).map(([category, categoryItems]) => (
                <React.Fragment key={category}>
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
                  {categoryItems.map((item) => {
                    const total = data.reduce((sum, restaurant) => {
                      const quantity =
                        restaurant.itemQuantities.find(
                          (q) => q.title === item.title
                        )?.quantity || 0;
                      return sum + quantity;
                    }, 0);

                    return (
                      <tr key={item.title}>
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

                        {data.map((restaurant) => (
                          <td
                            key={restaurant.restaurantName}
                            style={{
                              padding: "16px",
                              border: "1px solid #ddd",
                              textAlign: "center",
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

                {data.map((restaurant) => {
                  const grandTotal = restaurant.itemQuantities.reduce(
                    (sum, item) => sum + item.quantity,
                    0
                  );
                  return (
                    <td
                      key={restaurant.restaurantName}
                      style={{
                        padding: "16px",
                        border: "1px solid #ddd",
                        textAlign: "center",
                      }}
                    >
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
                  {data.reduce(
                    (sum, restaurant) =>
                      sum +
                      restaurant.itemQuantities.reduce(
                        (s, i) => s + i.quantity,
                        0
                      ),
                    0
                  )}
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