import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "@/components/data/api";
import { adminPaths } from "@/utils";

export default function ProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);
      setError(null);
      if (!api) {
        throw new Error("API not initialized");
      }
      const data = await api.listProducts();
      setProducts(data || []);
    } catch (err: any) {
      console.error("Failed to load products:", err);
      setError(err?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  function formatPrice(price: any) {
    if (typeof price === 'number') return `R ${price.toFixed(2)}`;
    if (typeof price === 'string') return `R ${parseFloat(price || '0').toFixed(2)}`;
    return 'R 0.00';
  }

  // Filter products based on search and status
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = !searchTerm || 
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || product.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [products, searchTerm, statusFilter]);

  if (loading) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen">
        <div className="bg-red-900 border border-red-700 rounded p-4 text-red-300">
          <p className="font-semibold">Error loading products</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={loadProducts}
            className="mt-3 px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container bg-gray-900 text-gray-100 p-6">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-white">
          Products
        </h1>
        <div className="flex gap-3 flex-wrap">
          <div className="relative w-60">
            <svg
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              className="w-full p-2 pl-10 rounded-md bg-gray-700 text-white border border-gray-600 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="p-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:ring-blue-500 focus:border-blue-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
          <Link
            to={adminPaths.productNew}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center gap-2"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New Product
          </Link>
        </div>
      </div>

        <div className="text-center py-12 bg-gray-800 rounded-lg shadow-lg">
          <div className="text-xl font-bold text-white">
            {products.length === 0 ? "No products yet" : "No products match your filters"}
          </div>
        </div>
      ) : (
        <div
          className="bg-gray-800 rounded-lg shadow-lg overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Slug</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Price</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Stock</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Updated</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {filteredProducts.map((product: any) => (
                  <tr key={product.id} className="hover:bg-gray-700 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{product.name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono">{product.slug || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-white price-cell">{formatPrice(product.price || product.price_cents ? (product.price_cents / 100) : 0)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-white">{product.stock_on_hand ?? product.stock_qty ?? product.stock ?? 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`status-badge ${product.status === 'active' ? 'bg-green-600' : product.status === 'draft' ? 'bg-blue-600' : 'bg-gray-600'} text-white px-2 py-1 rounded-full text-xs font-medium`}>
                        {product.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {product.updated_at ? new Date(product.updated_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        className="text-blue-500 hover:text-blue-400 underline cursor-pointer bg-transparent border-none p-0"
                        onClick={() => navigate(adminPaths.productEdit(product.id))}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

