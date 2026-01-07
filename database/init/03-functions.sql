-- TanStack POS System - Stored Functions and Procedures
-- This file contains all stored functions for the POS system

-- =====================================================
-- ORDER MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to generate next order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR(20) AS $$
DECLARE
    next_num INTEGER;
    order_prefix VARCHAR(10);
BEGIN
    SELECT COALESCE(value, 'ORD-') INTO order_prefix FROM settings WHERE key = 'order_number_prefix';
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM LENGTH(order_prefix) + 1) AS INTEGER)), 0) + 1 
    INTO next_num FROM orders;
    RETURN order_prefix || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate next payment number
CREATE OR REPLACE FUNCTION generate_payment_number()
RETURNS VARCHAR(20) AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(payment_number FROM 5) AS INTEGER)), 0) + 1 
    INTO next_num FROM payments;
    RETURN 'PAY-' || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to create a new order
CREATE OR REPLACE FUNCTION create_order(
    p_order_type order_type,
    p_table_id INTEGER DEFAULT NULL,
    p_server_id INTEGER DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_order_id INTEGER;
    v_order_number VARCHAR(20);
BEGIN
    v_order_number := generate_order_number();
    
    INSERT INTO orders (order_number, order_type, status, table_id, server_id, notes)
    VALUES (v_order_number, p_order_type, 'pending', p_table_id, p_server_id, p_notes)
    RETURNING id INTO v_order_id;
    
    -- Update table status if dine-in
    IF p_table_id IS NOT NULL THEN
        UPDATE tables SET status = 'occupied', current_order_id = v_order_id WHERE id = p_table_id;
    END IF;
    
    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;

-- Function to add item to order
CREATE OR REPLACE FUNCTION add_order_item(
    p_order_id INTEGER,
    p_product_id INTEGER,
    p_quantity INTEGER DEFAULT 1,
    p_notes TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_item_id INTEGER;
    v_unit_price DECIMAL(10, 2);
    v_subtotal DECIMAL(10, 2);
BEGIN
    -- Get product price
    SELECT price INTO v_unit_price FROM products WHERE id = p_product_id;
    
    IF v_unit_price IS NULL THEN
        RAISE EXCEPTION 'Product not found: %', p_product_id;
    END IF;
    
    v_subtotal := v_unit_price * p_quantity;
    
    -- Insert order item
    INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal, notes)
    VALUES (p_order_id, p_product_id, p_quantity, v_unit_price, v_subtotal, p_notes)
    RETURNING id INTO v_item_id;
    
    -- Update order totals
    PERFORM update_order_totals(p_order_id);
    
    RETURN v_item_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update order totals
CREATE OR REPLACE FUNCTION update_order_totals(p_order_id INTEGER)
RETURNS VOID AS $$
DECLARE
    v_subtotal DECIMAL(10, 2);
    v_tax_rate DECIMAL(5, 2);
    v_tax_amount DECIMAL(10, 2);
    v_total DECIMAL(10, 2);
BEGIN
    -- Calculate subtotal from items
    SELECT COALESCE(SUM(subtotal), 0) INTO v_subtotal
    FROM order_items WHERE order_id = p_order_id AND status != 'cancelled';
    
    -- Get tax rate from settings
    SELECT COALESCE(CAST(value AS DECIMAL), 10) INTO v_tax_rate
    FROM settings WHERE key = 'tax_rate';
    
    -- Calculate tax and total
    v_tax_amount := ROUND(v_subtotal * v_tax_rate / 100, 2);
    v_total := v_subtotal + v_tax_amount;
    
    -- Update order
    UPDATE orders 
    SET subtotal = v_subtotal, tax_amount = v_tax_amount, total = v_total
    WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update order status
CREATE OR REPLACE FUNCTION update_order_status(
    p_order_id INTEGER,
    p_status order_status
)
RETURNS VOID AS $$
BEGIN
    UPDATE orders SET status = p_status WHERE id = p_order_id;
    
    -- If completed or cancelled, update table status
    IF p_status IN ('completed', 'cancelled') THEN
        UPDATE tables SET status = 'available', current_order_id = NULL 
        WHERE current_order_id = p_order_id;
    END IF;
    
    -- If completed, set completed_at
    IF p_status = 'completed' THEN
        UPDATE orders SET completed_at = NOW() WHERE id = p_order_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update order item status
CREATE OR REPLACE FUNCTION update_order_item_status(
    p_item_id INTEGER,
    p_status order_status
)
RETURNS VOID AS $$
DECLARE
    v_order_id INTEGER;
BEGIN
    -- Get order id
    SELECT order_id INTO v_order_id FROM order_items WHERE id = p_item_id;
    
    -- Update item status
    UPDATE order_items SET status = p_status WHERE id = p_item_id;
    
    -- Check if all items are ready/served to update order status
    PERFORM check_order_status(v_order_id);
END;
$$ LANGUAGE plpgsql;

-- Function to check and update order status based on items
CREATE OR REPLACE FUNCTION check_order_status(p_order_id INTEGER)
RETURNS VOID AS $$
DECLARE
    v_pending_count INTEGER;
    v_preparing_count INTEGER;
    v_ready_count INTEGER;
    v_served_count INTEGER;
    v_total_count INTEGER;
BEGIN
    SELECT 
        COUNT(*) FILTER (WHERE status = 'pending'),
        COUNT(*) FILTER (WHERE status = 'preparing'),
        COUNT(*) FILTER (WHERE status = 'ready'),
        COUNT(*) FILTER (WHERE status = 'served'),
        COUNT(*)
    INTO v_pending_count, v_preparing_count, v_ready_count, v_served_count, v_total_count
    FROM order_items WHERE order_id = p_order_id AND status != 'cancelled';
    
    -- Update order status based on items
    IF v_served_count = v_total_count AND v_total_count > 0 THEN
        UPDATE orders SET status = 'served' WHERE id = p_order_id AND status NOT IN ('completed', 'cancelled');
    ELSIF v_ready_count + v_served_count = v_total_count AND v_total_count > 0 THEN
        UPDATE orders SET status = 'ready' WHERE id = p_order_id AND status NOT IN ('completed', 'cancelled', 'served');
    ELSIF v_preparing_count > 0 THEN
        UPDATE orders SET status = 'preparing' WHERE id = p_order_id AND status NOT IN ('completed', 'cancelled', 'served', 'ready');
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to remove item from order
CREATE OR REPLACE FUNCTION remove_order_item(p_item_id INTEGER)
RETURNS VOID AS $$
DECLARE
    v_order_id INTEGER;
BEGIN
    -- Get order id before deletion
    SELECT order_id INTO v_order_id FROM order_items WHERE id = p_item_id;
    
    -- Delete the item
    DELETE FROM order_items WHERE id = p_item_id;
    
    -- Update order totals
    IF v_order_id IS NOT NULL THEN
        PERFORM update_order_totals(v_order_id);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update item quantity
CREATE OR REPLACE FUNCTION update_order_item_quantity(
    p_item_id INTEGER,
    p_quantity INTEGER
)
RETURNS VOID AS $$
DECLARE
    v_order_id INTEGER;
    v_unit_price DECIMAL(10, 2);
BEGIN
    -- Get order_id and unit_price
    SELECT order_id, unit_price INTO v_order_id, v_unit_price
    FROM order_items WHERE id = p_item_id;
    
    -- Update quantity and subtotal
    UPDATE order_items 
    SET quantity = p_quantity, subtotal = v_unit_price * p_quantity
    WHERE id = p_item_id;
    
    -- Update order totals
    PERFORM update_order_totals(v_order_id);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PAYMENT FUNCTIONS
-- =====================================================

-- Function to process payment
CREATE OR REPLACE FUNCTION process_payment(
    p_order_id INTEGER,
    p_amount DECIMAL(10, 2),
    p_method payment_method,
    p_processed_by INTEGER,
    p_transaction_id VARCHAR(100) DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_payment_id INTEGER;
    v_payment_number VARCHAR(20);
    v_order_total DECIMAL(10, 2);
BEGIN
    -- Get order total
    SELECT total INTO v_order_total FROM orders WHERE id = p_order_id;
    
    IF v_order_total IS NULL THEN
        RAISE EXCEPTION 'Order not found: %', p_order_id;
    END IF;
    
    v_payment_number := generate_payment_number();
    
    -- Create payment record
    INSERT INTO payments (payment_number, order_id, amount, method, status, processed_by, transaction_id)
    VALUES (v_payment_number, p_order_id, p_amount, p_method, 'paid', p_processed_by, p_transaction_id)
    RETURNING id INTO v_payment_id;
    
    -- Update order status to completed
    PERFORM update_order_status(p_order_id, 'completed');
    
    RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql;

-- Function to refund payment
CREATE OR REPLACE FUNCTION refund_payment(
    p_payment_id INTEGER,
    p_processed_by INTEGER
)
RETURNS VOID AS $$
BEGIN
    UPDATE payments SET status = 'refunded', processed_by = p_processed_by WHERE id = p_payment_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get payment summary for a date range
CREATE OR REPLACE FUNCTION get_payment_summary(
    p_start_date DATE DEFAULT CURRENT_DATE,
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    method payment_method,
    total_count BIGINT,
    total_amount DECIMAL(10, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.method,
        COUNT(*)::BIGINT,
        SUM(p.amount)::DECIMAL(10,2)
    FROM payments p
    WHERE DATE(p.created_at) BETWEEN p_start_date AND p_end_date
    AND p.status = 'paid'
    GROUP BY p.method
    ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TABLE MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to update table status
CREATE OR REPLACE FUNCTION update_table_status(
    p_table_id INTEGER,
    p_status table_status,
    p_reserved_for VARCHAR(100) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE tables SET status = p_status, reserved_for = p_reserved_for WHERE id = p_table_id;
    
    -- Clear current order if status is available or cleaning
    IF p_status IN ('available', 'cleaning', 'reserved') THEN
        UPDATE tables SET current_order_id = NULL WHERE id = p_table_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get available tables
CREATE OR REPLACE FUNCTION get_available_tables(p_location VARCHAR(50) DEFAULT NULL)
RETURNS TABLE(
    id INTEGER,
    table_number VARCHAR(20),
    capacity INTEGER,
    location VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.table_number, t.capacity, t.location
    FROM tables t
    WHERE t.status = 'available'
    AND (p_location IS NULL OR t.location = p_location)
    ORDER BY t.table_number;
END;
$$ LANGUAGE plpgsql;

-- Function to get table summary
CREATE OR REPLACE FUNCTION get_table_summary()
RETURNS TABLE(
    location VARCHAR(50),
    total_tables BIGINT,
    available_count BIGINT,
    occupied_count BIGINT,
    reserved_count BIGINT,
    cleaning_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.location,
        COUNT(*)::BIGINT,
        COUNT(*) FILTER (WHERE t.status = 'available')::BIGINT,
        COUNT(*) FILTER (WHERE t.status = 'occupied')::BIGINT,
        COUNT(*) FILTER (WHERE t.status = 'reserved')::BIGINT,
        COUNT(*) FILTER (WHERE t.status = 'cleaning')::BIGINT
    FROM tables t
    GROUP BY t.location
    ORDER BY t.location;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- REPORTING FUNCTIONS
-- =====================================================

-- Function to get daily sales summary
CREATE OR REPLACE FUNCTION get_daily_sales(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
    total_orders BIGINT,
    total_revenue DECIMAL(10, 2),
    total_tax DECIMAL(10, 2),
    avg_order_value DECIMAL(10, 2),
    orders_by_type JSON,
    top_products JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT o.id)::BIGINT,
        COALESCE(SUM(o.total), 0)::DECIMAL(10,2),
        COALESCE(SUM(o.tax_amount), 0)::DECIMAL(10,2),
        COALESCE(AVG(o.total), 0)::DECIMAL(10,2),
        (SELECT json_agg(row_to_json(t)) FROM (
            SELECT order_type, COUNT(*) as count 
            FROM orders 
            WHERE DATE(created_at) = p_date AND status = 'completed'
            GROUP BY order_type
        ) t),
        (SELECT json_agg(row_to_json(t)) FROM (
            SELECT p.name, SUM(oi.quantity) as total_sold, SUM(oi.subtotal) as revenue
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            JOIN orders o ON oi.order_id = o.id
            WHERE DATE(o.created_at) = p_date AND o.status = 'completed'
            GROUP BY p.id, p.name
            ORDER BY total_sold DESC
            LIMIT 5
        ) t)
    FROM orders o
    WHERE DATE(o.created_at) = p_date AND o.status = 'completed';
END;
$$ LANGUAGE plpgsql;

-- Function to get sales by date range
CREATE OR REPLACE FUNCTION get_sales_report(
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE(
    report_date DATE,
    total_orders BIGINT,
    total_revenue DECIMAL(10, 2),
    dine_in_orders BIGINT,
    takeaway_orders BIGINT,
    delivery_orders BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(o.created_at) as report_date,
        COUNT(*)::BIGINT as total_orders,
        SUM(o.total)::DECIMAL(10,2) as total_revenue,
        COUNT(*) FILTER (WHERE o.order_type = 'dine_in')::BIGINT,
        COUNT(*) FILTER (WHERE o.order_type = 'takeaway')::BIGINT,
        COUNT(*) FILTER (WHERE o.order_type = 'delivery')::BIGINT
    FROM orders o
    WHERE DATE(o.created_at) BETWEEN p_start_date AND p_end_date
    AND o.status = 'completed'
    GROUP BY DATE(o.created_at)
    ORDER BY DATE(o.created_at);
END;
$$ LANGUAGE plpgsql;

-- Function to get hourly sales for a day
CREATE OR REPLACE FUNCTION get_hourly_sales(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
    hour INTEGER,
    order_count BIGINT,
    revenue DECIMAL(10, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXTRACT(HOUR FROM o.created_at)::INTEGER as hour,
        COUNT(*)::BIGINT as order_count,
        COALESCE(SUM(o.total), 0)::DECIMAL(10,2) as revenue
    FROM orders o
    WHERE DATE(o.created_at) = p_date AND o.status = 'completed'
    GROUP BY EXTRACT(HOUR FROM o.created_at)
    ORDER BY hour;
END;
$$ LANGUAGE plpgsql;

-- Function to get product sales by category
CREATE OR REPLACE FUNCTION get_category_sales(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    category_name VARCHAR(100),
    total_items BIGINT,
    total_revenue DECIMAL(10, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.name as category_name,
        SUM(oi.quantity)::BIGINT as total_items,
        SUM(oi.subtotal)::DECIMAL(10,2) as total_revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN categories c ON p.category_id = c.id
    JOIN orders o ON oi.order_id = o.id
    WHERE DATE(o.created_at) BETWEEN p_start_date AND p_end_date
    AND o.status = 'completed'
    GROUP BY c.id, c.name
    ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get top selling products
CREATE OR REPLACE FUNCTION get_top_products(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
    p_end_date DATE DEFAULT CURRENT_DATE,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    product_id INTEGER,
    product_name VARCHAR(100),
    category_name VARCHAR(100),
    total_quantity BIGINT,
    total_revenue DECIMAL(10, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        c.name,
        SUM(oi.quantity)::BIGINT,
        SUM(oi.subtotal)::DECIMAL(10,2)
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN categories c ON p.category_id = c.id
    JOIN orders o ON oi.order_id = o.id
    WHERE DATE(o.created_at) BETWEEN p_start_date AND p_end_date
    AND o.status = 'completed'
    GROUP BY p.id, p.name, c.name
    ORDER BY SUM(oi.quantity) DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- KITCHEN DISPLAY FUNCTIONS
-- =====================================================

-- Function to get kitchen orders (pending and preparing)
CREATE OR REPLACE FUNCTION get_kitchen_orders()
RETURNS TABLE(
    order_id INTEGER,
    order_number VARCHAR(20),
    order_type order_type,
    table_number VARCHAR(20),
    created_at TIMESTAMP,
    minutes_elapsed INTEGER,
    items JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.order_number,
        o.order_type,
        t.table_number,
        o.created_at,
        EXTRACT(EPOCH FROM (NOW() - o.created_at))::INTEGER / 60,
        (SELECT json_agg(row_to_json(i)) FROM (
            SELECT 
                oi.id, 
                p.name, 
                oi.quantity, 
                oi.status::TEXT, 
                oi.notes
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = o.id AND oi.status NOT IN ('served', 'cancelled')
            ORDER BY oi.id
        ) i)
    FROM orders o
    LEFT JOIN tables t ON o.table_id = t.id
    WHERE o.status IN ('pending', 'preparing', 'ready')
    ORDER BY 
        CASE WHEN o.status = 'pending' THEN 0 ELSE 1 END,
        o.created_at;
END;
$$ LANGUAGE plpgsql;

-- Function to mark all items of an order as a specific status
CREATE OR REPLACE FUNCTION mark_order_items_status(
    p_order_id INTEGER,
    p_status order_status
)
RETURNS VOID AS $$
BEGIN
    UPDATE order_items SET status = p_status WHERE order_id = p_order_id AND status != 'cancelled';
    PERFORM check_order_status(p_order_id);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to get setting value
CREATE OR REPLACE FUNCTION get_setting(p_key VARCHAR(100))
RETURNS TEXT AS $$
DECLARE
    v_value TEXT;
BEGIN
    SELECT value INTO v_value FROM settings WHERE key = p_key;
    RETURN v_value;
END;
$$ LANGUAGE plpgsql;

-- Function to update setting
CREATE OR REPLACE FUNCTION update_setting(p_key VARCHAR(100), p_value TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE settings SET value = p_value WHERE key = p_key;
    IF NOT FOUND THEN
        INSERT INTO settings (key, value) VALUES (p_key, p_value);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has permission based on role
CREATE OR REPLACE FUNCTION check_permission(
    p_user_id INTEGER,
    p_required_roles user_role[]
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_role user_role;
BEGIN
    SELECT role INTO v_user_role FROM users WHERE id = p_user_id AND is_active = TRUE;
    
    IF v_user_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Admin has all permissions
    IF v_user_role = 'admin' THEN
        RETURN TRUE;
    END IF;
    
    RETURN v_user_role = ANY(p_required_roles);
END;
$$ LANGUAGE plpgsql;

-- Function to search products
CREATE OR REPLACE FUNCTION search_products(
    p_search_term VARCHAR(100) DEFAULT NULL,
    p_category_id INTEGER DEFAULT NULL,
    p_available_only BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(
    id INTEGER,
    name VARCHAR(100),
    description TEXT,
    price DECIMAL(10, 2),
    category_name VARCHAR(100),
    emoji VARCHAR(10),
    is_available BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        c.name as category_name,
        p.emoji,
        p.is_available
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE (p_search_term IS NULL OR p.name ILIKE '%' || p_search_term || '%')
    AND (p_category_id IS NULL OR p.category_id = p_category_id)
    AND (NOT p_available_only OR p.is_available = TRUE)
    ORDER BY c.sort_order, p.name;
END;
$$ LANGUAGE plpgsql;

-- Function to toggle product availability
CREATE OR REPLACE FUNCTION toggle_product_availability(p_product_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_new_status BOOLEAN;
BEGIN
    UPDATE products 
    SET is_available = NOT is_available 
    WHERE id = p_product_id
    RETURNING is_available INTO v_new_status;
    
    RETURN v_new_status;
END;
$$ LANGUAGE plpgsql;

-- Function to get order details with items
CREATE OR REPLACE FUNCTION get_order_details(p_order_id INTEGER)
RETURNS TABLE(
    order_info JSON,
    items JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT row_to_json(o) FROM (
            SELECT 
                ord.id,
                ord.order_number,
                ord.order_type,
                ord.status,
                t.table_number,
                u.full_name as server_name,
                ord.subtotal,
                ord.tax_amount,
                ord.discount_amount,
                ord.total,
                ord.notes,
                ord.created_at,
                ord.completed_at
            FROM orders ord
            LEFT JOIN tables t ON ord.table_id = t.id
            LEFT JOIN users u ON ord.server_id = u.id
            WHERE ord.id = p_order_id
        ) o),
        (SELECT json_agg(row_to_json(i)) FROM (
            SELECT 
                oi.id,
                p.name as product_name,
                p.emoji,
                oi.quantity,
                oi.unit_price,
                oi.subtotal,
                oi.status,
                oi.notes
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = p_order_id
            ORDER BY oi.id
        ) i);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for active orders with details
CREATE OR REPLACE VIEW v_active_orders AS
SELECT 
    o.id,
    o.order_number,
    o.order_type,
    o.status,
    t.table_number,
    u.full_name as server_name,
    o.subtotal,
    o.tax_amount,
    o.total,
    o.notes,
    o.created_at,
    EXTRACT(EPOCH FROM (NOW() - o.created_at))::INTEGER / 60 as minutes_elapsed,
    (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id AND oi.status != 'cancelled') as item_count
FROM orders o
LEFT JOIN tables t ON o.table_id = t.id
LEFT JOIN users u ON o.server_id = u.id
WHERE o.status NOT IN ('completed', 'cancelled')
ORDER BY o.created_at;

-- View for product catalog
CREATE OR REPLACE VIEW v_product_catalog AS
SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.emoji,
    p.is_available,
    p.preparation_time,
    c.id as category_id,
    c.name as category_name,
    c.icon as category_icon
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_available = TRUE
ORDER BY c.sort_order, p.name;

-- View for table overview
CREATE OR REPLACE VIEW v_table_overview AS
SELECT 
    t.id,
    t.table_number,
    t.capacity,
    t.status,
    t.location,
    t.reserved_for,
    o.order_number as current_order_number,
    o.total as current_order_total,
    o.created_at as order_started_at
FROM tables t
LEFT JOIN orders o ON t.current_order_id = o.id
ORDER BY t.location, t.table_number;

-- View for daily dashboard stats
CREATE OR REPLACE VIEW v_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURRENT_DATE AND status = 'completed') as todays_orders,
    (SELECT COALESCE(SUM(total), 0) FROM orders WHERE DATE(created_at) = CURRENT_DATE AND status = 'completed') as todays_revenue,
    (SELECT COUNT(*) FROM orders WHERE status NOT IN ('completed', 'cancelled')) as active_orders,
    (SELECT COUNT(*) FROM tables WHERE status = 'occupied') as occupied_tables,
    (SELECT COUNT(*) FROM tables WHERE status = 'available') as available_tables,
    (SELECT COUNT(*) FROM tables WHERE status = 'reserved') as reserved_tables,
    (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 60), 0) 
     FROM orders WHERE DATE(created_at) = CURRENT_DATE AND completed_at IS NOT NULL) as avg_order_time_minutes;

-- View for staff performance
CREATE OR REPLACE VIEW v_staff_performance AS
SELECT 
    u.id,
    u.full_name,
    u.role,
    COUNT(o.id) as total_orders,
    COALESCE(SUM(o.total), 0) as total_sales,
    COALESCE(AVG(o.total), 0) as avg_order_value
FROM users u
LEFT JOIN orders o ON u.id = o.server_id AND o.status = 'completed' AND DATE(o.created_at) = CURRENT_DATE
WHERE u.role IN ('server', 'counter')
GROUP BY u.id, u.full_name, u.role
ORDER BY total_sales DESC;

-- Output success message
SELECT 'Functions and views created successfully!' AS message;
