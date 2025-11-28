  // 5. List Products - This gets overridden by the adapter
  async listProducts() {
    try {
      console.log('🔍 api.listProducts() called - default fallback');
      console.log('❓ This means the adapter did NOT override this method');
      return [];
    } catch (error) {
      console.warn('⚠️ Failed to fetch products via default fallback:', error);
      return [];
    }
  },

  // 6. List Products (Variant-Aware) - Only returns main products
  async listMainProducts() {
    try {
      console.log('🔍 api.listMainProducts() called - fetching only main products');
      const url = '/.netlify/functions/admin-products';
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch products.");
      const result = await response.json();
      
      // Filter out variants - only return main products
      if (result.ok && Array.isArray(result.data)) {
        const mainProducts = result.data.filter(product => 
          !product.is_variant && 
          product.is_variant !== true
        );
        console.log(`📊 Fetched ${mainProducts.length} main products (${result.data.length} total products)`);
        return mainProducts;
      }
      
      return [];
    } catch (error) {
      console.warn('⚠️ Failed to fetch main products:', error);
      return [];
    }
  },