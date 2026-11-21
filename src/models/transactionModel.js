const { pool } = require("../config/database");

const fail = (message, status) => Object.assign(new Error(message), { status });
const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const lineTotal = (item, priceField) => round2(Number(item.quantity) * Number(item[priceField]));
const keyOf = (item) => `${item.fruitId}:${item.packagingSize}`;

// Adds up the quantity requested for each fruit + package size. A sale may list the same
// fruit and size on two lines, and stock has to cover the sum, not each line on its own.
function quantitiesNeeded(items) {
  const needed = new Map();
  for (const item of items) {
    const key = keyOf(item);
    const entry = needed.get(key) || {
      fruitId: item.fruitId,
      packagingSize: item.packagingSize,
      quantity: 0,
    };
    entry.quantity += Number(item.quantity);
    needed.set(key, entry);
  }
  // Always lock rows in the same order so two concurrent sales cannot deadlock each other.
  return [...needed.values()].sort(
    (a, b) => a.fruitId - b.fruitId || a.packagingSize.localeCompare(b.packagingSize),
  );
}

async function recordPurchase({ supplierId, purchaseDate, items }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[supplier]] = await connection.query(
      "SELECT supplier_id FROM suppliers WHERE supplier_id = ?",
      [supplierId],
    );
    if (!supplier) throw fail("Supplier not found", 404);

    for (const { fruitId } of quantitiesNeeded(items)) {
      const [[fruit]] = await connection.query(
        "SELECT fruit_id FROM fruits WHERE fruit_id = ? AND status = 'ACTIVE'",
        [fruitId],
      );
      if (!fruit) throw fail(`Fruit ${fruitId} does not exist or is inactive`, 400);
    }

    const total = round2(items.reduce((sum, item) => sum + lineTotal(item, "unitCost"), 0));
    const [purchase] = await connection.query(
      "INSERT INTO purchases (supplier_id, purchase_date, total_amount) VALUES (?, COALESCE(?, CURDATE()), ?)",
      [supplierId, purchaseDate || null, total],
    );

    for (const item of items) {
      await connection.query(
        `INSERT INTO purchase_details (purchase_id, fruit_id, quantity, unit_cost, packaging_size)
         VALUES (?, ?, ?, ?, ?)`,
        [purchase.insertId, item.fruitId, item.quantity, item.unitCost, item.packagingSize],
      );
      await connection.query(
        `INSERT INTO stock (fruit_id, packaging_size, available_quantity) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE available_quantity = available_quantity + VALUES(available_quantity)`,
        [item.fruitId, item.packagingSize, item.quantity],
      );
    }
    await connection.commit();
    return { purchaseId: purchase.insertId, totalAmount: total };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function recordSale({
  vendorId,
  saleDate,
  paymentStatus,
  paymentMethod,
  amountPaid,
  items,
}) {
  const total = round2(items.reduce((sum, item) => sum + lineTotal(item, "unitPrice"), 0));

  // The status and the amount have to agree, otherwise vendor balances become wrong.
  let paid = round2(Number(amountPaid ?? 0));
  if (!Number.isFinite(paid) || paid < 0) throw fail("Amount paid must be zero or more", 400);
  if (paymentStatus === "PAID") {
    paid = total;
  } else if (paymentStatus === "UNPAID") {
    if (paid > 0) throw fail("An unpaid sale cannot have an amount paid", 400);
  } else if (paid <= 0 || paid >= total) {
    throw fail("A partially paid sale needs an amount paid above zero and below the total", 400);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[vendor]] = await connection.query("SELECT vendor_id FROM vendors WHERE vendor_id = ?", [
      vendorId,
    ]);
    if (!vendor) throw fail("Vendor not found", 404);

    // Lock every requested stock row before creating the sale. Any failure rolls back all items.
    for (const need of quantitiesNeeded(items)) {
      const [[fruit]] = await connection.query(
        "SELECT fruit_id FROM fruits WHERE fruit_id = ? AND status = 'ACTIVE'",
        [need.fruitId],
      );
      if (!fruit) throw fail(`Fruit ${need.fruitId} does not exist or is inactive`, 400);

      const [[stock]] = await connection.query(
        `SELECT available_quantity FROM stock
         WHERE fruit_id = ? AND packaging_size = ? FOR UPDATE`,
        [need.fruitId, need.packagingSize],
      );
      const available = stock ? stock.available_quantity : 0;
      if (available < need.quantity) {
        throw fail(
          `Insufficient ${need.packagingSize.toLowerCase()} stock for fruit ${need.fruitId}; requested ${need.quantity}, available ${available}`,
          409,
        );
      }
    }

    const [sale] = await connection.query(
      `INSERT INTO sales
       (vendor_id, sale_date, payment_status, payment_method, amount_paid, total_amount, outstanding_balance)
       VALUES (?, COALESCE(?, CURDATE()), ?, ?, ?, ?, ?)`,
      [
        vendorId,
        saleDate || null,
        paymentStatus,
        paymentMethod,
        paid,
        total,
        round2(total - paid),
      ],
    );

    for (const item of items) {
      await connection.query(
        `INSERT INTO sales_details (sale_id, fruit_id, packaging_size, quantity, unit_price)
         VALUES (?, ?, ?, ?, ?)`,
        [sale.insertId, item.fruitId, item.packagingSize, item.quantity, item.unitPrice],
      );
      const [update] = await connection.query(
        `UPDATE stock SET available_quantity = available_quantity - ?
         WHERE fruit_id = ? AND packaging_size = ? AND available_quantity >= ?`,
        [item.quantity, item.fruitId, item.packagingSize, item.quantity],
      );
      if (update.affectedRows !== 1) {
        throw fail(`Stock for fruit ${item.fruitId} changed while saving the sale`, 409);
      }
    }
    await connection.commit();
    return {
      saleId: sale.insertId,
      totalAmount: total,
      amountPaid: paid,
      outstandingBalance: round2(total - paid),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Groups detail rows under their parent record: [{...header, items: [...]}]
function attachItems(headers, details, idField) {
  const byParent = new Map();
  for (const row of details) {
    const list = byParent.get(row[idField]) || [];
    list.push(row);
    byParent.set(row[idField], list);
  }
  return headers.map((header) => ({ ...header, items: byParent.get(header[idField]) || [] }));
}

async function listSales(limit = 200) {
  const [sales] = await pool.query(
    `SELECT s.sale_id, s.vendor_id, v.vendor_name, s.sale_date, s.payment_status, s.payment_method,
            s.amount_paid, s.total_amount, s.outstanding_balance
     FROM sales s JOIN vendors v ON v.vendor_id = s.vendor_id
     ORDER BY s.sale_date DESC, s.sale_id DESC LIMIT ?`,
    [limit],
  );
  if (!sales.length) return [];
  const [details] = await pool.query(
    `SELECT sd.sale_id, sd.fruit_id, f.fruit_name, sd.packaging_size, sd.quantity, sd.unit_price
     FROM sales_details sd JOIN fruits f ON f.fruit_id = sd.fruit_id
     WHERE sd.sale_id IN (?) ORDER BY sd.sales_detail_id`,
    [sales.map((sale) => sale.sale_id)],
  );
  return attachItems(sales, details, "sale_id");
}

async function listPurchases(limit = 200) {
  const [purchases] = await pool.query(
    `SELECT p.purchase_id, p.supplier_id, s.business_name AS supplier_name, p.purchase_date, p.total_amount
     FROM purchases p JOIN suppliers s ON s.supplier_id = p.supplier_id
     ORDER BY p.purchase_date DESC, p.purchase_id DESC LIMIT ?`,
    [limit],
  );
  if (!purchases.length) return [];
  const [details] = await pool.query(
    `SELECT pd.purchase_id, pd.fruit_id, f.fruit_name, pd.packaging_size, pd.quantity, pd.unit_cost
     FROM purchase_details pd JOIN fruits f ON f.fruit_id = pd.fruit_id
     WHERE pd.purchase_id IN (?) ORDER BY pd.purchase_detail_id`,
    [purchases.map((purchase) => purchase.purchase_id)],
  );
  return attachItems(purchases, details, "purchase_id");
}

// Every figure is limited to the requested date range.
async function reports(from, to) {
  const [topFruits] = await pool.query(
    `SELECT f.fruit_name, SUM(sd.quantity) AS boxes_sold
     FROM sales s
     JOIN sales_details sd ON sd.sale_id = s.sale_id
     JOIN fruits f ON f.fruit_id = sd.fruit_id
     WHERE s.sale_date BETWEEN ? AND ?
     GROUP BY f.fruit_id, f.fruit_name ORDER BY boxes_sold DESC, f.fruit_name LIMIT 5`,
    [from, to],
  );
  const [[revenue]] = await pool.query(
    "SELECT COALESCE(SUM(total_amount), 0) AS total_revenue FROM sales WHERE sale_date BETWEEN ? AND ?",
    [from, to],
  );
  const [topVendor] = await pool.query(
    `SELECT v.vendor_name, SUM(sd.quantity) AS boxes_purchased
     FROM sales s JOIN vendors v ON v.vendor_id = s.vendor_id
     JOIN sales_details sd ON sd.sale_id = s.sale_id
     WHERE s.sale_date BETWEEN ? AND ?
     GROUP BY v.vendor_id, v.vendor_name ORDER BY boxes_purchased DESC, v.vendor_name LIMIT 1`,
    [from, to],
  );
  return { topFruits, revenue, topVendor: topVendor[0] || null };
}

module.exports = { recordPurchase, recordSale, listSales, listPurchases, reports, quantitiesNeeded };
