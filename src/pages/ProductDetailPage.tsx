import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { supabase } from '../components/supabaseClient';

interface Product {
  id: string;
  name: string;
  description: string;
  inci_ingredients: string;
  how_to_use: string;
  shipping_info: string;
  price: number;
  stock: number;
  is_active: boolean;
  thumbnail_url: string;
  category: string;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) {
          throw error;
        }
        
        if (data) {
          setProduct(data);
        } else {
          setError('Product not found');
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch product');
        console.error('Error fetching product:', err);
      } finally {
        setLoading(false);
      }
    }
    
    if (id) {
      fetchProduct();
    }
  }, [id]);

  // Check if content exists for each tab
  const hasIngredients = product?.inci_ingredients && product.inci_ingredients.trim() !== '';
  const hasHowToUse = product?.how_to_use && product.how_to_use.trim() !== '';
  const hasShippingInfo = product?.shipping_info && product.shipping_info.trim() !== '';
  const hasDescription = product?.description && product.description.trim() !== '';

  // Check if any tabs have content
  const hasAnyTabs = hasIngredients || hasHowToUse || hasShippingInfo;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500 text-center">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
          <p>The product you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        {/* Product Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
              <p className="text-gray-600">Category: {product.category}</p>
            </div>
            <div className="mt-4 md:mt-0">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                product.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {product.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Product Main Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Product Image */}
            <div className="flex justify-center">
              {product.thumbnail_url ? (
                <img
                  src={product.thumbnail_url}
                  alt={product.name}
                  className="w-full max-w-md h-auto rounded-lg shadow-md object-cover"
                />
              ) : (
                <div className="w-full max-w-md h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-gray-500">No Image Available</span>
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Price & Stock</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price:</span>
                    <span className="font-bold text-gray-900">R{product.price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stock:</span>
                    <span className="font-bold text-gray-900">{product.stock}</span>
                  </div>
                </div>
              </div>

              {/* Main Description - Always shown if exists */}
              {hasDescription && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                  <div
                    className="prose max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: product.description }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Tabs Section - Only shown if any tabs have content */}
          {hasAnyTabs && (
            <div className="mt-8">
              <Tabs defaultValue="description" className="w-full">
                <TabsList className="flex flex-wrap gap-2 bg-gray-50 p-2 rounded-lg">
                  {/* Only render Description tab if it has content and we're not showing it above */}
                  {hasDescription && (
                    <TabsTrigger value="description" className="data-[state=active]:bg-pink-400 data-[state=active]:text-white">
                      Description
                    </TabsTrigger>
                  )}
                  
                  {/* Only render Ingredients tab if content exists */}
                  {hasIngredients && (
                    <TabsTrigger value="ingredients" className="data-[state=active]:bg-pink-400 data-[state=active]:text-white">
                      Ingredients
                    </TabsTrigger>
                  )}
                  
                  {/* Only render How to Use tab if content exists */}
                  {hasHowToUse && (
                    <TabsTrigger value="how-to-use" className="data-[state=active]:bg-pink-400 data-[state=active]:text-white">
                      How to Use
                    </TabsTrigger>
                  )}
                  
                  {/* Only render Shipping tab if content exists */}
                  {hasShippingInfo && (
                    <TabsTrigger value="shipping" className="data-[state=active]:bg-pink-400 data-[state=active]:text-white">
                      Shipping Info
                    </TabsTrigger>
                  )}
                </TabsList>

                {/* Tab Content - Only render if corresponding trigger exists */}
                {hasDescription && (
                  <TabsContent value="description">
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div
                        className="prose max-w-none"
                        dangerouslySetInnerHTML={{ __html: product.description }}
                      />
                    </div>
                  </TabsContent>
                )}
                
                {hasIngredients && (
                  <TabsContent value="ingredients">
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div
                        className="prose max-w-none whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: product.inci_ingredients }}
                      />
                    </div>
                  </TabsContent>
                )}
                
                {hasHowToUse && (
                  <TabsContent value="how-to-use">
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div
                        className="prose max-w-none whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: product.how_to_use }}
                      />
                    </div>
                  </TabsContent>
                )}
                
                {hasShippingInfo && (
                  <TabsContent value="shipping">
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div
                        className="prose max-w-none whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: product.shipping_info }}
                      />
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}