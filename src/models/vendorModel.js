const { pool } = require("../config/database");

// Totals come from subqueries so a sale with several items is never counted more than once.
const list = async (search = "") => {
  const term = `%${search}%`;
  return (
    await pool.query(
      `SELECT v.*,
        COALESCE((SELECT SUM(sa.outstanding_balance) FROM sales sa
                  WHERE sa.vendor_id = v.vendor_id), 0) AS outstanding_balance,
        COALESCE((SELECT SUM(sd.quantity) FROM sales sa
                  JOIN sales_details sd ON sd.sale_id = sa.sale_id
                  WHERE sa.vendor_id = v.vendor_id), 0) AS boxes_purchased
       FROM vendors v
       WHERE v.vendor_name LIKE ? OR v.phone_number LIKE ? OR v.location LIKE ?
       ORDER BY v.vendor_name`,
      [term, term, term],
    )
  )[0];
};
const findById = async (id) =>
  (await pool.query("SELECT * FROM vendors WHERE vendor_id = ?", [id]))[0][0];
const create = async (data) => {
  const [result] = await pool.query(
    "INSERT INTO vendors (vendor_name, phone_number, location, registration_date) VALUES (?, ?, ?, COALESCE(?, CURDATE()))",
    [data.vendorName, data.phoneNumber, data.location, data.registrationDate || null],
  );
  return findById(result.insertId);
};
const remove = async (id) => {
  // Keep sales history intact: vendors with recorded sales cannot be deleted.
  const [sales] = await pool.query("SELECT COUNT(*) AS count FROM sales WHERE vendor_id = ?", [id]);
  if (Number(sales[0].count) > 0) {
    const error = new Error("This vendor has sales records and cannot be deleted. Keep the account to preserve transaction history.");
    error.status = 409;
    throw error;
  }
  await pool.query("DELETE FROM vendors WHERE vendor_id = ?", [id]);
};
const update = async (id, data) => {
  await pool.query(
    "UPDATE vendors SET vendor_name = ?, phone_number = ?, location = ? WHERE vendor_id = ?",
    [data.vendorName, data.phoneNumber, data.location, id],
  );
  return findById(id);
};

module.exports = { list, findById, create, update, remove };
