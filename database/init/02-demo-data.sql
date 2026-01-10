-- TanStack POS System - Demo Data
-- This file inserts all demo data for the POS system

-- =====================================================
-- USERS (Demo accounts with better-auth compatible structure)
-- All passwords are hashed using bcrypt (original: admin123)
-- Password hash generated with: bcrypt.hash('admin123', 10)
-- =====================================================
INSERT INTO users (id, username, display_username, email, email_verified, full_name, name, role, phone, is_active) VALUES
('user_admin_001', 'admin', 'Admin', 'admin@posystem.com', TRUE, 'System Administrator', 'Admin', 'admin', '+1 234 567 8901', TRUE),
('user_manager_001', 'manager1', 'Manager1', 'manager@posystem.com', TRUE, 'John Manager', 'John', 'manager', '+1 234 567 8902', TRUE),
('user_server_001', 'server1', 'Server1', 'server1@posystem.com', TRUE, 'Sarah Server', 'Sarah', 'server', '+1 234 567 8903', TRUE),
('user_server_002', 'server2', 'Server2', 'server2@posystem.com', TRUE, 'Mike Waiter', 'Mike', 'server', '+1 234 567 8904', TRUE),
('user_counter_001', 'counter1', 'Counter1', 'counter1@posystem.com', TRUE, 'Emily Cashier', 'Emily', 'counter', '+1 234 567 8905', TRUE),
('user_counter_002', 'counter2', 'Counter2', 'counter2@posystem.com', TRUE, 'David Counter', 'David', 'counter', '+1 234 567 8906', TRUE),
('user_kitchen_001', 'kitchen1', 'Kitchen1', 'kitchen@posystem.com', TRUE, 'Chef Gordon', 'Gordon', 'kitchen', '+1 234 567 8907', TRUE);

-- Create account entries for credential-based login (better-auth requirement)
-- Password: admin123 hashed with better-auth's hashPassword function
INSERT INTO account (id, account_id, provider_id, user_id, password) VALUES
('acc_admin_001', 'user_admin_001', 'credential', 'user_admin_001', '0358fad5d5a5b56a077b01ab34200ff8:f3d5a5ba689066d592b0a2377f465fb5fdf434b9a9093e61351342a7ef9a6893ca306e45104d528bc02e55acfe43eb76cd2e8901a0897220458b9496089001a6'),
('acc_manager_001', 'user_manager_001', 'credential', 'user_manager_001', '0358fad5d5a5b56a077b01ab34200ff8:f3d5a5ba689066d592b0a2377f465fb5fdf434b9a9093e61351342a7ef9a6893ca306e45104d528bc02e55acfe43eb76cd2e8901a0897220458b9496089001a6'),
('acc_server_001', 'user_server_001', 'credential', 'user_server_001', '0358fad5d5a5b56a077b01ab34200ff8:f3d5a5ba689066d592b0a2377f465fb5fdf434b9a9093e61351342a7ef9a6893ca306e45104d528bc02e55acfe43eb76cd2e8901a0897220458b9496089001a6'),
('acc_server_002', 'user_server_002', 'credential', 'user_server_002', '0358fad5d5a5b56a077b01ab34200ff8:f3d5a5ba689066d592b0a2377f465fb5fdf434b9a9093e61351342a7ef9a6893ca306e45104d528bc02e55acfe43eb76cd2e8901a0897220458b9496089001a6'),
('acc_counter_001', 'user_counter_001', 'credential', 'user_counter_001', '0358fad5d5a5b56a077b01ab34200ff8:f3d5a5ba689066d592b0a2377f465fb5fdf434b9a9093e61351342a7ef9a6893ca306e45104d528bc02e55acfe43eb76cd2e8901a0897220458b9496089001a6'),
('acc_counter_002', 'user_counter_002', 'credential', 'user_counter_002', '0358fad5d5a5b56a077b01ab34200ff8:f3d5a5ba689066d592b0a2377f465fb5fdf434b9a9093e61351342a7ef9a6893ca306e45104d528bc02e55acfe43eb76cd2e8901a0897220458b9496089001a6'),
('acc_kitchen_001', 'user_kitchen_001', 'credential', 'user_kitchen_001', '0358fad5d5a5b56a077b01ab34200ff8:f3d5a5ba689066d592b0a2377f465fb5fdf434b9a9093e61351342a7ef9a6893ca306e45104d528bc02e55acfe43eb76cd2e8901a0897220458b9496089001a6');

-- =====================================================
-- CATEGORIES
-- =====================================================
INSERT INTO categories (id, name, description, icon, sort_order, is_active) VALUES
(1, 'Appetizers', 'Starters and small bites to begin your meal', 'Salad', 1, TRUE),
(2, 'Main Course', 'Hearty main dishes and entrees', 'Beef', 2, TRUE),
(3, 'Pizza', 'Hand-tossed artisan pizzas', 'Pizza', 3, TRUE),
(4, 'Beverages', 'Hot and cold drinks', 'Coffee', 4, TRUE),
(5, 'Desserts', 'Sweet treats and desserts', 'IceCream', 5, TRUE);

-- Reset sequence for categories
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));

-- =====================================================
-- PRODUCTS
-- =====================================================
INSERT INTO products (id, name, description, price, category_id, emoji, is_available, preparation_time) VALUES
-- Appetizers (category_id = 1)
(1, 'Caesar Salad', 'Fresh romaine lettuce with Caesar dressing, croutons, and parmesan', 9.99, 1, '🥗', TRUE, 8),
(2, 'Chicken Wings', 'Crispy fried wings with choice of sauce', 11.99, 1, '🍗', TRUE, 12),
(3, 'French Fries', 'Golden crispy french fries with seasoning', 5.99, 1, '🍟', TRUE, 6),
(4, 'Garlic Bread', 'Toasted bread with garlic butter and herbs', 4.99, 1, '🥖', TRUE, 5),

-- Main Course (category_id = 2)
(5, 'Classic Burger', 'Beef patty with lettuce, tomato, onion, and special sauce', 12.99, 2, '🍔', TRUE, 15),
(6, 'Grilled Salmon', 'Atlantic salmon fillet with herb butter and vegetables', 22.99, 2, '🐟', TRUE, 18),
(7, 'Pasta Carbonara', 'Creamy pasta with bacon, egg, and parmesan', 15.99, 2, '🍝', TRUE, 14),
(8, 'Steak', 'Premium cut ribeye steak with sides', 28.99, 2, '🥩', TRUE, 20),

-- Pizza (category_id = 3)
(9, 'Margherita Pizza', 'Classic pizza with tomato sauce, mozzarella, and fresh basil', 14.99, 3, '🍕', TRUE, 15),
(10, 'Pepperoni Pizza', 'Pizza topped with pepperoni and mozzarella cheese', 16.99, 3, '🍕', TRUE, 15),

-- Beverages (category_id = 4)
(11, 'Cappuccino', 'Espresso with steamed milk foam', 4.99, 4, '☕', TRUE, 3),
(12, 'Fresh Juice', 'Freshly squeezed seasonal fruit juice', 5.99, 4, '🧃', TRUE, 4),
(15, 'Red Wine', 'House red wine by the glass', 12.99, 4, '🍷', TRUE, 1),
(16, 'Beer', 'Draft beer selection', 6.99, 4, '🍺', TRUE, 1),

-- Desserts (category_id = 5)
(13, 'Chocolate Cake', 'Rich chocolate layer cake with ganache', 7.99, 5, '🍰', TRUE, 2),
(14, 'Ice Cream', 'Three scoops of artisan ice cream', 6.99, 5, '🍨', TRUE, 2);

-- Reset sequence for products
SELECT setval('products_id_seq', (SELECT MAX(id) FROM products));

-- =====================================================
-- TABLES (Restaurant seating)
-- =====================================================
INSERT INTO tables (id, table_number, capacity, status, location) VALUES
-- Indoor tables
(1, '1', 2, 'available', 'Indoor'),
(2, '2', 4, 'available', 'Indoor'),
(3, '3', 4, 'available', 'Indoor'),
(4, '4', 6, 'available', 'Indoor'),
(5, '5', 4, 'available', 'Indoor'),
(6, '6', 2, 'available', 'Indoor'),
(7, '7', 8, 'available', 'Indoor'),
(8, '8', 4, 'available', 'Indoor'),
-- Outdoor tables
(9, 'O1', 4, 'available', 'Outdoor'),
(10, 'O2', 6, 'available', 'Outdoor'),
(11, 'O3', 4, 'available', 'Outdoor'),
(12, 'O4', 2, 'available', 'Outdoor'),
-- VIP tables
(13, 'V1', 10, 'available', 'VIP'),
(14, 'V2', 8, 'available', 'VIP'),
-- Bar tables
(15, 'B1', 6, 'available', 'Bar'),
(16, 'B2', 4, 'available', 'Bar');

-- Reset sequence for tables
SELECT setval('tables_id_seq', (SELECT MAX(id) FROM tables));

-- =====================================================
-- SETTINGS (System configuration)
-- =====================================================
INSERT INTO settings (key, value, description) VALUES
-- Restaurant Info
('restaurant_name', 'TanStack Restaurant', 'Name of the restaurant'),
('restaurant_address', '123 Main Street, City, Country', 'Physical address'),
('restaurant_phone', '+1 234 567 8900', 'Contact phone number'),
('restaurant_email', 'contact@tanstack-restaurant.com', 'Contact email'),
('restaurant_website', 'https://tanstack-restaurant.com', 'Website URL'),

-- Financial Settings
('currency', 'USD', 'Currency code'),
('currency_symbol', '$', 'Currency symbol'),
('tax_rate', '10', 'Tax rate percentage'),
('service_charge', '0', 'Service charge percentage'),
('tip_enabled', 'true', 'Enable tip option'),
('tip_percentages', '10,15,18,20', 'Suggested tip percentages'),

-- Receipt Settings
('receipt_header', 'Thank you for dining with us!', 'Receipt header message'),
('receipt_footer', 'Please visit us again!', 'Receipt footer message'),
('print_receipt_auto', 'true', 'Auto print receipt on payment'),
('receipt_show_tax', 'true', 'Show tax breakdown on receipt'),

-- Order Settings
('order_number_prefix', 'ORD-', 'Prefix for order numbers'),
('table_required_for_dine_in', 'true', 'Require table selection for dine-in'),
('allow_order_notes', 'true', 'Allow special notes on orders'),
('max_items_per_order', '50', 'Maximum items allowed per order'),

-- Kitchen Settings
('kitchen_display_enabled', 'true', 'Enable kitchen display system'),
('kitchen_sound_enabled', 'true', 'Play sound on new orders'),
('order_preparation_alert', '15', 'Alert when order preparation exceeds minutes'),

-- Notification Settings
('email_notifications', 'true', 'Send email notifications'),
('sms_notifications', 'false', 'Send SMS notifications'),
('low_stock_alert', '10', 'Low stock alert threshold'),

-- Business Hours
('business_hours_mon', '09:00-22:00', 'Monday business hours'),
('business_hours_tue', '09:00-22:00', 'Tuesday business hours'),
('business_hours_wed', '09:00-22:00', 'Wednesday business hours'),
('business_hours_thu', '09:00-22:00', 'Thursday business hours'),
('business_hours_fri', '09:00-23:00', 'Friday business hours'),
('business_hours_sat', '10:00-23:00', 'Saturday business hours'),
('business_hours_sun', '10:00-21:00', 'Sunday business hours');

-- =====================================================
-- OUTPUT SUCCESS MESSAGE
-- =====================================================
SELECT 'Demo data inserted successfully!' AS message;
SELECT COUNT(*) AS total_users FROM users;
SELECT COUNT(*) AS total_categories FROM categories;
SELECT COUNT(*) AS total_products FROM products;
SELECT COUNT(*) AS total_tables FROM tables;
SELECT COUNT(*) AS total_orders FROM orders;
SELECT COUNT(*) AS total_order_items FROM order_items;
SELECT COUNT(*) AS total_payments FROM payments;
SELECT COUNT(*) AS total_settings FROM settings;
