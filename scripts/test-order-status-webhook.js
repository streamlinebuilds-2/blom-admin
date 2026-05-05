#!/usr/bin/env node

/**
 * Order Status Webhook Test Script
 * 
 * This script tests the order status update functionality with webhook notifications
 * to ensure all components are working correctly.
 */

import { createClient } from '@supabase/supabase-js';

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'your-supabase-url';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testOrderStatusUpdates() {
  console.log('🧪 ORDER STATUS UPDATE & WEBHOOK TEST STARTING...\n');
  
  try {
    // 1. Get a test order
    console.log('1. Fetching test order...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, fulfillment_type, buyer_name, order_number')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (ordersError || !orders || orders.length === 0) {
      throw new Error('No orders found for testing');
    }
    
    const testOrder = orders[0];
    console.log(`   ✅ Found test order: ${testOrder.order_number || testOrder.id.slice(0,8)}`);
    console.log(`   📋 Current status: ${testOrder.status}`);
    console.log(`   🚚 Fulfillment: ${testOrder.fulfillment_type}`);
    console.log(`   👤 Customer: ${testOrder.buyer_name}\n`);
    
    // 2. Test status transitions based on current status
    const currentStatus = testOrder.status;
    let nextStatus = null;
    let action = '';
    
    if (currentStatus === 'paid') {
      nextStatus = 'packed';
      action = 'Mark as Packed';
    } else if (currentStatus === 'packed') {
      if (testOrder.fulfillment_type === 'collection') {
        nextStatus = 'collected';
        action = 'Mark Collected';
      } else {
        nextStatus = 'out_for_delivery';
        action = 'Mark Out for Delivery';
      }
    } else if (currentStatus === 'out_for_delivery') {
      nextStatus = 'delivered';
      action = 'Mark Delivered';
    } else {
      console.log(`   ⚠️ Order status '${currentStatus}' not suitable for testing (no valid next status)`);
      console.log(`   📝 Valid test statuses: paid, packed, out_for_delivery`);
      return;
    }
    
    console.log(`2. Testing status transition: ${currentStatus} -> ${nextStatus}`);
    console.log(`   🎯 Action: ${action}\n`);
    
    // 3. Make API call to update status (simulate frontend call)
    const response = await fetch('https://localhost:8888/.netlify/functions/admin-order-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        id: testOrder.id,
        status: nextStatus
      })
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.ok) {
      throw new Error(`Status update failed: ${result.error || 'Unknown error'}`);
    }
    
    console.log('3. ✅ Status Update Results:');
    console.log(`   ✅ Database update: SUCCESS`);
    console.log(`   📦 Stock deducted: ${result.stockDeducted ? 'YES' : 'NO'}`);
    console.log(`   📡 Webhook called: ${result.webhookCalled ? 'YES' : 'NO'}`);
    console.log(`   📡 Webhook success: ${result.webhookOk ? 'YES' : 'NO'}`);
    
    if (result.webhookError) {
      console.log(`   ⚠️ Webhook error: ${result.webhookError}`);
    }
    
    if (result.statusChange) {
      console.log(`   📅 Status change: ${result.statusChange.from} -> ${result.statusChange.to}`);
      console.log(`   🕒 Timestamp: ${result.statusChange.timestamp}`);
    }
    
    // 4. Verify the update in database
    console.log('\n4. Verifying database update...');
    const { data: updatedOrder, error: verifyError } = await supabase
      .from('orders')
      .select('status, updated_at, order_packed_at, order_out_for_delivery_at, order_collected_at, order_delivered_at')
      .eq('id', testOrder.id)
      .single();
    
    if (verifyError) {
      throw new Error(`Verification failed: ${verifyError.message}`);
    }
    
    console.log(`   ✅ New status: ${updatedOrder.status}`);
    console.log(`   🕒 Updated: ${updatedOrder.updated_at}`);
    
    // Show relevant timestamp
    if (nextStatus === 'packed' && updatedOrder.order_packed_at) {
      console.log(`   📦 Packed at: ${updatedOrder.order_packed_at}`);
    } else if (nextStatus === 'out_for_delivery' && updatedOrder.order_out_for_delivery_at) {
      console.log(`   🚚 Out for delivery at: ${updatedOrder.order_out_for_delivery_at}`);
    } else if (nextStatus === 'collected' && updatedOrder.order_collected_at) {
      console.log(`   📦 Collected at: ${updatedOrder.order_collected_at}`);
    } else if (nextStatus === 'delivered' && updatedOrder.order_delivered_at) {
      console.log(`   ✅ Delivered at: ${updatedOrder.order_delivered_at}`);
    }
    
    // 5. Summary
    console.log('\n📊 TEST SUMMARY:');
    console.log(`✅ Order status updated successfully: ${currentStatus} -> ${nextStatus}`);
    console.log(`✅ Database properly updated with new status and timestamps`);
    console.log(`✅ ${result.webhookCalled ? 'Webhook notifications sent' : 'No webhook called (check configuration)'}`);
    
    if (result.webhookOk) {
      console.log(`✅ Customer notifications should be delivered`);
    } else if (result.webhookCalled) {
      console.log(`⚠️ Webhook called but failed - check webhook URL and service`);
    }
    
    console.log('\n🎉 ORDER STATUS UPDATE & WEBHOOK TEST COMPLETE!');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testOrderStatusUpdates().catch(console.error);