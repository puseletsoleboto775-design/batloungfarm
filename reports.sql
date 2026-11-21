-- Five most frequently sold fruits (selected date range)
SELECT f.fruit_name, SUM(sd.quantity) AS boxes_sold
FROM sales s
JOIN sales_details sd ON sd.sale_id = s.sale_id
JOIN fruits f ON f.fruit_id = sd.fruit_id
WHERE s.sale_date BETWEEN '2025-01-01' AND '2025-12-31'
GROUP BY f.fruit_id, f.fruit_name
ORDER BY boxes_sold DESC
LIMIT 5;

-- Revenue for a selected date range
SELECT COALESCE(SUM(total_amount), 0) AS total_revenue
FROM sales
WHERE sale_date BETWEEN '2025-01-01' AND '2025-12-31';

-- Vendor that purchased the most boxes (selected date range)
SELECT v.vendor_name, SUM(sd.quantity) AS boxes_purchased
FROM sales s
JOIN vendors v ON v.vendor_id = s.vendor_id
JOIN sales_details sd ON sd.sale_id = s.sale_id
WHERE s.sale_date BETWEEN '2025-01-01' AND '2025-12-31'
GROUP BY v.vendor_id, v.vendor_name
ORDER BY boxes_purchased DESC
LIMIT 1;

-- Current stock by fruit and packaging size
SELECT f.fruit_name, s.packaging_size, s.available_quantity
FROM stock s
JOIN fruits f ON f.fruit_id = s.fruit_id
ORDER BY f.fruit_name, FIELD(s.packaging_size, 'SMALL', 'MEDIUM', 'LARGE');

-- Outstanding balance by vendor
SELECT v.vendor_name, COALESCE(SUM(s.outstanding_balance), 0) AS outstanding_balance
FROM vendors v
LEFT JOIN sales s ON s.vendor_id = v.vendor_id
GROUP BY v.vendor_id, v.vendor_name
ORDER BY outstanding_balance DESC;
