import React, { useEffect, useState } from "react";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
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
      format: "a3" // Changed to A3 for more space
    });
    
    const headers = ["Item", ...data.map((d) => d.restaurantName)];
    const rows = [];

    items.forEach((item) => {
      const row = [item.title];
      data.forEach((restaurant) => {
        const quantity =
          restaurant.itemQuantities.find(
            (q) => q.title === item.title
          )?.quantity || "";
        row.push(quantity);
      });
      rows.push(row);
    });

    // Calculate optimal column widths based on content
    const maxRestaurantNameLength = Math.max(...data.map(d => d.restaurantName.length));
    const maxItemNameLength = Math.max(...items.map(item => item.title.length));
    
    // Base column widths
    const itemColumnWidth = Math.min(Math.max(maxItemNameLength * 2, 25), 50); // Min 25mm, Max 50mm
    // const restaurantColumnWidth = Math.min(Math.max(maxRestaurantNameLength * 1.8, 20), 35); // Min 20mm, Max 35mm
    const restaurantColumnWidth = Math.min(Math.max(maxRestaurantNameLength * 1.4, 14), 26)

    // Set title with bigger font
    doc.setFontSize(20);
    doc.text("Today's Invoice Grid", doc.internal.pageSize.getWidth() / 2, 15, { align: "center" });

    // Add timestamp
    doc.setFontSize(10);
    const timestamp = new Date().toLocaleString();
    doc.text(`Generated: ${timestamp}`, 10, 10);

    // Configure table with optimized settings
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 25,
      styles: {
        fontSize: 9,
        cellPadding: 2,
        overflow: 'linebreak',
        cellWidth: 'wrap',
        halign: 'center', // Center align all cells
      },
      headStyles: {
        fillColor: [220, 38, 38],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { // Item column
          cellWidth: itemColumnWidth,
          fontStyle: 'bold',
          halign: 'left',
        },
        ...Object.fromEntries(
          Array.from({ length: headers.length - 1 }, (_, i) => [
            i + 1,
            {
              cellWidth: restaurantColumnWidth,
              halign: 'center',
            }
          ])
        ),
      },
      didDrawPage: function(data) {
        // Add page number
        doc.setFontSize(10);
        doc.text(
          `Page ${data.pageNumber}`,
          doc.internal.pageSize.getWidth() - 20,
          doc.internal.pageSize.getHeight() - 10
        );
      },
      margin: { top: 25, right: 15, bottom: 15, left: 15 },
      theme: 'grid',
      tableWidth: 'auto',
      didDrawCell: function(data) {
        // Add extra styling for header cells if needed
        if (data.row.index === 0) {
          doc.setTextColor(255, 255, 255);
        }
      },
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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
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
            '& .MuiAlert-icon': {
              color: theme.palette.primary.main
            }
          }}
        >
          <AlertTitle>No Orders Found</AlertTitle>
          There are no orders for today. New orders will appear here as they come in.
        </Alert>
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Paper elevation={3} sx={{ width: "92%", p: 3,marginLeft:'3.5%' ,marginTop:'15px'}}>
        <Typography
          variant="h4"
          color="primary"
          align="center"
          gutterBottom
          sx={{ fontWeight: "bold" }}
        >
          Today's Invoice Grid
        </Typography>
        <Box sx={{ width: "100%", overflow: "auto" }}>
          <table 
            id="invoice-table" 
            style={{ 
              minWidth: "100%", 
              borderCollapse: "collapse",
              whiteSpace: "nowrap"
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
                    minWidth: "200px",
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
                    }}
                  >
                    {restaurant.restaurantName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
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
                      }}
                    >
                      {restaurant.itemQuantities.find(
                        (q) => q.title === item.title
                      )?.quantity || "-"}
                    </td>
                  ))}
                </tr>
              ))}
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