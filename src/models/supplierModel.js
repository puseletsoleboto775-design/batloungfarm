const { pool } = require("../config/database");

const list = async () => (await pool.query("SELECT * FROM suppliers ORDER BY business_name"))[0];
const findById = async (id) =>
  (await pool.query("SELECT * FROM suppliers WHERE supplier_id = ?", [id]))[0][0];
const create = async (data) => {
  const [result] = await pool.query(
    `INSERT INTO suppliers (business_name, contact_person, phone, province, address)
     VALUES (?, ?, ?, ?, ?)`,
    [data.businessName, data.contactPerson, data.phone, data.province, data.address],
  );
  return findById(result.insertId);
};
const update = async (id, data) => {
  await pool.query(
    `UPDATE suppliers SET business_name = ?, contact_person = ?, phone = ?, province = ?, address = ?
     WHERE supplier_id = ?`,
    [data.businessName, data.contactPerson, data.phone, data.province, data.address, id],
  );
  return findById(id);
};
const remove = async (id) => pool.query("DELETE FROM suppliers WHERE supplier_id = ?", [id]);

module.exports = { list, findById, create, update, remove };
