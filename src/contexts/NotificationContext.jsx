import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const NotificationContext = createContext();

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const [counts, setCounts] = useState({
    orders: 0,
    course_bookings: 0,
    messages: 0,
    reviews: 0
  });

  // Helper to get local timestamp or default to epoch
  const getLastChecked = (key) => {
    return localStorage.getItem(`last_checked_${key}`) || '1970-01-01T00:00:00.000Z';
  };

  const updateCounts = async () => {
    try {
      const lastOrders = getLastChecked('orders');
      const lastBookings = getLastChecked('course_bookings');
      const lastMessages = getLastChecked('messages');
      const lastReviews = getLastChecked('reviews');

      // Fetch counts in parallel
      const [
        { count: ordersCount },
        { count: bookingsCount },
        { count: messagesCount },
        { count: reviewsCount }
      ] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }).gt('placed_at', lastOrders),
        supabase.from('course_purchases').select('*', { count: 'exact', head: true }).gt('created_at', lastBookings),
        supabase.from('messages').select('*', { count: 'exact', head: true }).gt('created_at', lastMessages),
        supabase.from('reviews').select('*', { count: 'exact', head: true }).gt('created_at', lastReviews)
      ]);

      setCounts({
        orders: ordersCount || 0,
        course_bookings: bookingsCount || 0,
        messages: messagesCount || 0,
        reviews: reviewsCount || 0
      });
    } catch (err) {
      console.error('Error fetching notification counts:', err);
    }
  };

  // Update counts on mount and every minute
  useEffect(() => {
    updateCounts();
    const interval = setInterval(updateCounts, 60000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = (section) => {
    const now = new Date().toISOString();
    localStorage.setItem(`last_checked_${section}`, now);
    // Optimistically clear count
    setCounts(prev => ({ ...prev, [section]: 0 }));
    // Re-fetch to be sure (optional, maybe overkill)
  };

  return (
    <NotificationContext.Provider value={{ counts, markAsRead, refreshNotifications: updateCounts }}>
      {children}
    </NotificationContext.Provider>
  );
}
