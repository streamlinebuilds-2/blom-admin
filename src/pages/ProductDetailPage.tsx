import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../components/supabaseClient';
import { ProductPageTemplate } from '../../ProductPageTemplate';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<any | null>(null);
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
          .eq('slug', slug)
          .single();
        
        if (error) {
          throw error;
        }
        
        if (data) {
          // Map database columns to ProductPageTemplate expected format
          const mappedProduct = {
            name: data.name,
            slug: data.slug,
            category: data.category,
            shortDescription: data.short_description || '',
            overview: data.overview || '',
            price: `R${data.price}`,
            compareAtPrice: data.compare_at_price ? `R${data.compare_at_price}` : undefined,
            stock: data.stock?.toString() || '0',
            images: data.gallery_urls || (data.thumbnail_url ? [data.thumbnail_url] : []),
            features: data.features || [],
            howToUse: data.how_to_use || [],
            ingredients: {
              inci: data.inci_ingredients || [],
              key: data.key_ingredients || []
            },
            details: {
              size: data.size || '',
              shelfLife: data.shelf_life || '',
              claims: data.claims || []
            },
            variants: data.variants || [],
            related: data.related || [],
            rating: 5, // Default or fetch from reviews
            reviewCount: 0, // Default or fetch count
            reviews: [], // Fetch reviews separately if needed
            seo: {
              title: data.meta_title || data.name,
              description: data.meta_description || data.short_description
            }
          };
          setProduct(mappedProduct);
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
    
    if (slug) {
      fetchProduct();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-400"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
          <p>{error || "The product you're looking for doesn't exist."}</p>
        </div>
      </div>
    );
  }

  return <ProductPageTemplate product={product} />;
}