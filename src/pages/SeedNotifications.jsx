import React from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/ToastProvider';

export default function SeedNotifications() {
  const { showToast } = useToast();
  const [loading, setLoading] = React.useState(false);

  const seed = async () => {
    setLoading(true);
    const now = new Date().toISOString();

    try {
      // 1. Reset localStorage for Orders and Bookings
      localStorage.setItem('last_checked_orders', '1970-01-01T00:00:00.000Z');
      localStorage.setItem('last_checked_course_bookings', '1970-01-01T00:00:00.000Z');

      // 2. Insert 1 Course Booking (purchase)
      const { data: courses } = await supabase.from('courses').select('slug').limit(1);
      const slug = courses?.[0]?.slug || 'dummy-course';

      const { error: bookingError } = await supabase.from('course_purchases').insert([
        {
          course_slug: slug,
          buyer_email: 'test@example.com',
          buyer_name: 'Test Buyer',
          invitation_status: 'pending',
          course_type: 'online',
          amount_cents: 10000,
          created_at: now
        }
      ]);

      if (bookingError) {
        console.error('Booking seed error:', bookingError);
        showToast(`Booking seed failed: ${bookingError.message}`, 'error');
      }

      // 3. Insert 2 Reviews (pending)
      const { data: products } = await supabase.from('products').select('id').limit(1);
      const productId = products?.[0]?.id;

      if (productId) {
        const { error: reviewError } = await supabase.from('reviews').insert([
          {
            product_id: productId,
            rating: 5,
            title: 'Test Review 1',
            content: 'This is a test review pending approval.',
            author_name: 'Reviewer 1',
            status: 'pending',
            created_at: now
          },
          {
            product_id: productId,
            rating: 4,
            title: 'Test Review 2',
            content: 'Another test review.',
            author_name: 'Reviewer 2',
            status: 'pending',
            created_at: now
          }
        ]);
         if (reviewError) {
           console.error('Review seed error:', reviewError);
           showToast(`Review seed failed: ${reviewError.message}`, 'error');
         }
      } else {
        console.warn('No products found to attach reviews to');
      }

      // 4. Insert 2 Messages (new)
      const { error: messageError } = await supabase.from('messages').insert([
        {
          name: 'Test Sender 1',
          email: 'sender1@example.com',
          subject: 'Test Message 1',
          message: 'Hello, this is a test message.',
          status: 'new',
          created_at: now
        },
        {
          name: 'Test Sender 2',
          email: 'sender2@example.com',
          subject: 'Test Message 2',
          message: 'Another test message.',
          status: 'new',
          created_at: now
        }
      ]);
      if (messageError) {
        console.error('Message seed error:', messageError);
        showToast(`Message seed failed: ${messageError.message}`, 'error');
      }

      showToast('Notifications seeded successfully! Refreshing...', 'success');
      setTimeout(() => window.location.reload(), 1500);

    } catch (e) {
      console.error(e);
      showToast('Failed to seed notifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Seed Notifications</h1>
      <p className="mb-4">This will insert dummy data to test notifications:</p>
      <ul className="list-disc ml-6 mb-6">
        <li>1 Course Booking (and reset last_checked)</li>
        <li>2 Pending Reviews</li>
        <li>2 New Messages</li>
      </ul>
      <Button onClick={seed} disabled={loading}>
        {loading ? 'Seeding...' : 'Seed Data'}
      </Button>
    </div>
  );
}
