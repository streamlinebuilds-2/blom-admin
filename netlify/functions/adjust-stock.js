import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export const handler = async (event) => {
  try {
    const { productId, delta, reason, costPriceCents } = JSON.parse(event.body || "{}");

    if (!productId || typeof delta !== 'number') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields: productId, delta" })
      };
    }

    // Get current product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Product not found" })
      };
    }

    // Update cost price if provided
    if (costPriceCents !== undefined) {
      const { error: costError } = await supabase
        .from('products')
        .update({ cost_price_cents: costPriceCents })
        .eq('id', productId);
      
      if (costError) {
        console.error("Error updating cost price:", costError);
      }
    }

    // Adjust stock if delta is not zero
    if (delta !== 0) {
      const newQty = (product.stock || 0) + delta;

      const { error: updateError } = await supabase
        .from('products')
        .update({ stock: newQty })
        .eq('id', productId);

      if (updateError) {
        console.error("Error updating stock:", updateError);
        throw new Error("Failed to update stock");
      }

      // Log stock movement
      const { error: moveError } = await supabase
        .from('stock_movements')
        .insert([{
          product_id: productId,
          delta: delta,
          reason: reason || 'manual_adjustment',
          product_name: product.name,
          created_at: new Date().toISOString()
        }]);

      if (moveError) {
        console.error("Error logging stock movement:", moveError);
        // Don't fail the whole operation for logging errors
      }
    }

    // Return updated product
    const { data: updatedProduct, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (fetchError) {
      console.error("Error fetching updated product:", fetchError);
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        success: true,
        product: updatedProduct,
        message: delta !== 0 ? `Stock adjusted by ${delta}` : 'Cost price updated'
      }),
    };
  } catch (e) {
    console.error("Adjust stock error:", e);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: e.message || "Server error" }),
    };
  }
};