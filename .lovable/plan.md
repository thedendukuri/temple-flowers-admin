
# Vinayaka Pooja Flowers — Admin Portal

## Brand & Visual Design
A warm, temple-inspired admin portal with soft cream backgrounds, saffron orange accents, deep brown headings, and clean sans-serif typography. Light mode only. Calm, premium, devotional feel throughout.

---

## 1. Backend Setup (Lovable Cloud / Supabase)
- **FlowerOrders table** with columns: OrderID, CustomerName, Email, PhoneNumber, PickupDate, TimeSlot, SpecialRequests, Status (enum: Pending/Completed/Cancelled/Picked Up), CreatedAt
- **Authentication** using Supabase Auth (email/password)
- **User roles table** (admin role) to restrict portal access to authorized admins only
- **Row-Level Security** policies so only authenticated admins can read/modify orders
- Seed some sample order data for testing

## 2. Login Page
- Centered login card with logo placeholder, email & password fields, saffron login button
- Error messages in muted red
- Redirect unauthenticated users here; successful login → `/admin/dashboard`

## 3. Dashboard Layout
- **Left sidebar** (cream): Dashboard, Orders, Customer Emails, Logout
- **Top header**: Admin name, current date, new orders notification badge
- **Main content area**: Card-based, dynamic based on selected sidebar tab

## 4. Dashboard Overview
- **Summary cards**: Total Orders, Pending Orders, Completed Orders, Today's Pickups
- **Line chart**: Orders over time (saffron/brown palette)
- **Pie chart**: Time slot distribution (Morning, Evening, Night)

## 5. Orders Management
- Styled table displaying all orders with search (name/email/phone), status filter, pickup date filter, sorting, and pagination (10/page)
- **Admin actions**: Update status dropdown, delete with confirmation modal, view full order detail in popup modal

## 6. Customer Emails Page
- Aggregated view of unique customer emails with name, total orders, last order date
- Export to CSV, Copy All Emails button, search, filter by order count and date range

## 7. Security
- Route protection: all `/admin/*` routes require authentication + admin role
- Proper Supabase RLS policies with security definer functions for role checks
