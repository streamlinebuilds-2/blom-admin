-- Remove demo orders that were inserted for course booking UI testing

-- 1) Remove demo course purchases
delete from course_purchases
where details->>'seed' = 'demo'
   or buyer_email in (
     'alicia.demo@example.com',
     'ben.tester@example.com',
     'cara.example@example.com',
     'dylan.sample@example.com',
     'emma.demo@example.com'
   );

-- 2) Remove demo orders
delete from orders
where order_number like 'DEMO-COURSE-%'
   or invoice_url like 'https://example.com/receipt-demo-%'
   or buyer_email in (
     'alicia.demo@example.com',
     'ben.tester@example.com',
     'cara.example@example.com',
     'dylan.sample@example.com',
     'emma.demo@example.com'
   );

