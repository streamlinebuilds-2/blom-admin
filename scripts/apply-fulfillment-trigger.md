# Apply Fulfillment Type Auto-Sync Trigger

## What This Does

Creates a database trigger that automatically copies `fulfillment_method` (or `delivery_method`) to `fulfillment_type` whenever an order is created or updated.

This ensures the `fulfillment_type` column is always populated, even if the checkout only sets `fulfillment_method`.

---

## How to Apply

### **Option 1: Supabase Dashboard (Recommended)**

1. Go to: https://supabase.com/dashboard/project/yvmnedjybrpvlupygusf/sql/new
2. Copy the SQL from: `db/migrations/sync_fulfillment_type_trigger.sql`
3. Paste into SQL Editor
4. Click **"Run"**
5. You should see: "Success. No rows returned"

### **Option 2: Using psql**

If you have direct database access:

```bash
psql "postgresql://postgres:[PASSWORD]@db.yvmnedjybrpvlupygusf.supabase.co:5432/postgres" \
  -f db/migrations/sync_fulfillment_type_trigger.sql
```

---

## Verification

After applying, test it by creating a new order:

```bash
# The trigger should automatically set fulfillment_type
curl -X POST \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "order_number": "TEST-TRIGGER-001",
    "fulfillment_method": "delivery",
    "status": "placed"
  }' \
  "https://yvmnedjybrpvlupygusf.supabase.co/rest/v1/orders"

# Then check if fulfillment_type was auto-populated
curl -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  "https://yvmnedjybrpvlupygusf.supabase.co/rest/v1/orders?order_number=eq.TEST-TRIGGER-001&select=fulfillment_type,fulfillment_method"

# Should show: fulfillment_type: "delivery"
```

---

## What the Trigger Does

```
BEFORE INSERT OR UPDATE on orders:
  IF fulfillment_type IS NULL AND fulfillment_method IS NOT NULL THEN
    fulfillment_type = fulfillment_method
  END IF

  IF fulfillment_type IS NULL AND delivery_method IS NOT NULL THEN
    fulfillment_type = delivery_method
  END IF
```

**Priority:**
1. First tries `fulfillment_method`
2. Falls back to `delivery_method`
3. Only updates if `fulfillment_type` is NULL

---

## Benefits

✅ **Automatic**: No code changes needed in checkout
✅ **Backward compatible**: Works with old and new order formats
✅ **Zero downtime**: Applied instantly
✅ **Idempotent**: Safe to run multiple times

---

## Rollback (if needed)

To remove the trigger:

```sql
DROP TRIGGER IF EXISTS sync_fulfillment_type_trigger ON orders;
DROP FUNCTION IF EXISTS sync_fulfillment_type();
```
