CREATE DATABASE  batloung_farm
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE batloung_farm;

-- Safe to run more than once: tables are only created if missing and sample rows are only
-- inserted if they do not already exist, so existing data is never dropped.

CREATE TABLE  suppliers (
  supplier_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  business_name VARCHAR(120) NOT NULL UNIQUE,
  contact_person VARCHAR(100) NOT NULL,
  phone VARCHAR(25) NOT NULL UNIQUE,
  province ENUM('Gauteng','Free State','KwaZulu-Natal','Western Cape','Eastern Cape','Limpopo','Mpumalanga','North West') NOT NULL,
  address VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fruits (
  fruit_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fruit_name VARCHAR(60) NOT NULL UNIQUE,
  description VARCHAR(255),
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vendors (
  vendor_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vendor_name VARCHAR(120) NOT NULL,
  phone_number VARCHAR(25) NOT NULL UNIQUE,
  location VARCHAR(160) NOT NULL,
  registration_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_vendor_name (vendor_name)
);

CREATE TABLE purchases (
  purchase_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  supplier_id INT UNSIGNED NOT NULL,
  purchase_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  total_amount DECIMAL(12,2) UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_purchase_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE purchase_details (
  purchase_detail_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  purchase_id INT UNSIGNED NOT NULL,
  fruit_id INT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  unit_cost DECIMAL(10,2) UNSIGNED NOT NULL,
  packaging_size ENUM('SMALL','MEDIUM','LARGE') NOT NULL,
  CONSTRAINT chk_purchase_qty CHECK (quantity > 0),
  CONSTRAINT chk_purchase_cost CHECK (unit_cost > 0),
  CONSTRAINT fk_detail_purchase FOREIGN KEY (purchase_id) REFERENCES purchases(purchase_id) ON DELETE CASCADE,
  CONSTRAINT fk_purchase_fruit FOREIGN KEY (fruit_id) REFERENCES fruits(fruit_id) ON DELETE RESTRICT
);

CREATE TABLE sales (
  sale_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT UNSIGNED NOT NULL,
  sale_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  payment_status ENUM('PAID','PARTIALLY_PAID','UNPAID') NOT NULL,
  payment_method ENUM('CASH','MOBILE_MONEY','CREDIT') NOT NULL,
  amount_paid DECIMAL(12,2) UNSIGNED NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) UNSIGNED NOT NULL,
  outstanding_balance DECIMAL(12,2) UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sales_date (sale_date),
  CONSTRAINT chk_payment_amount CHECK (amount_paid <= total_amount),
  CONSTRAINT chk_outstanding_balance CHECK (outstanding_balance = total_amount - amount_paid),
  CONSTRAINT fk_sale_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE  sales_details (
  sales_detail_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sale_id INT UNSIGNED NOT NULL,
  fruit_id INT UNSIGNED NOT NULL,
  packaging_size ENUM('SMALL','MEDIUM','LARGE') NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  unit_price DECIMAL(10,2) UNSIGNED NOT NULL,
  CONSTRAINT chk_sale_qty CHECK (quantity > 0),
  CONSTRAINT chk_sale_price CHECK (unit_price > 0),
  CONSTRAINT fk_detail_sale FOREIGN KEY (sale_id) REFERENCES sales(sale_id) ON DELETE CASCADE,
  CONSTRAINT fk_sale_fruit FOREIGN KEY (fruit_id) REFERENCES fruits(fruit_id) ON DELETE RESTRICT
);

CREATE TABLE stock (
  stock_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fruit_id INT UNSIGNED NOT NULL,
  packaging_size ENUM('SMALL','MEDIUM','LARGE') NOT NULL,
  available_quantity INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_fruit_package UNIQUE (fruit_id, packaging_size),
  CONSTRAINT chk_nonnegative_stock CHECK (available_quantity >= 0),
  CONSTRAINT fk_stock_fruit FOREIGN KEY (fruit_id) REFERENCES fruits(fruit_id) ON DELETE RESTRICT
);

INSERT IGNORE INTO suppliers (business_name, contact_person, phone, province, address) VALUES
('Cape Fresh Produce','Pieter van Wyk','+27 71 445 0192','Western Cape','14 Market Road, Cape Town'),
('Limpopo Harvest','Nandi Mokoena','+27 82 330 7811','Limpopo','8 Farm Lane, Polokwane'),
('Gauteng Fruit Co.','Sipho Dlamini','+27 73 214 6680','Gauteng','22 Produce Avenue, Johannesburg');

INSERT IGNORE INTO fruits (fruit_name, description) VALUES
('Apples','Crisp red and green apples'),('Bananas','Fresh Cavendish bananas'),
('Oranges','Sweet Valencia oranges'),('Mangoes','Ripe seasonal mangoes'),('Grapes','Seedless table grapes');

INSERT IGNORE INTO vendors (vendor_name, phone_number, location, registration_date) VALUES
('Mpho Street Market','+266 58 112 490','Maseru Central','2025-02-10'),
('Thabo Mini Mart','+266 63 094 122','Thetsane','2025-03-14'),
('Lerato Fruits','+266 57 340 085','Mafeteng Road','2025-05-02');

INSERT IGNORE INTO stock (fruit_id, packaging_size, available_quantity)
SELECT f.fruit_id, p.packaging_size,
  CASE p.packaging_size WHEN 'SMALL' THEN 30 WHEN 'MEDIUM' THEN 20 ELSE 10 END
FROM fruits f
CROSS JOIN (
  SELECT 'SMALL' packaging_size UNION ALL
  SELECT 'MEDIUM' UNION ALL
  SELECT 'LARGE'
) p;
