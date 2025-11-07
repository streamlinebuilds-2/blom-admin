import React from 'react';
import { Star } from 'lucide-react';

export type Review = {
  id: string;
  name: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
};

type ReviewSectionProps = {
  productName: string;
  productImage: string;
  productSlug: string;
  averageRating: number;
  reviewCount: number;
  reviews: Review[];
  onReviewSubmit?: (review: { name: string; email: string; rating: number; title: string; comment: string }) => void;
};

export const ReviewSection: React.FC<ReviewSectionProps> = ({
  productName,
  productImage,
  productSlug,
  averageRating,
  reviewCount,
  reviews,
  onReviewSubmit,
}) => {
  const [formState, setFormState] = React.useState({
    name: '',
    email: '',
    rating: 5,
    title: '',
    comment: '',
  });

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    onReviewSubmit?.(formState);
    setFormState({ name: '', email: '', rating: 5, title: '', comment: '' });
  };

  return (
    <section className="section-padding bg-white">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="lg:w-2/5">
            <h2 className="text-3xl font-bold text-gray-900">Customer Reviews</h2>
            <p className="mt-2 text-sm text-gray-600">
              {reviewCount} review{reviewCount === 1 ? '' : 's'} for {productName}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, index) => (
                  <Star
                    key={index}
                    className={`h-5 w-5 ${index < Math.round(averageRating) ? 'fill-current text-yellow-400' : 'text-gray-300'}`}
                  />
                ))}
              </div>
              <span className="text-sm font-semibold text-gray-700">{averageRating.toFixed(1)} / 5</span>
            </div>
            <img
              src={productImage}
              alt={productName}
              className="mt-6 w-full max-w-xs rounded-2xl object-cover shadow-md"
            />
          </div>

          <div className="flex-1 space-y-8">
            <div className="space-y-6 rounded-3xl border border-gray-200 bg-gray-50 p-6">
              {reviews.length === 0 ? (
                <p className="text-sm text-gray-600">No reviews yet. Be the first to leave a review for this product.</p>
              ) : (
                reviews.slice(0, 6).map((review) => (
                  <div key={review.id} className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{review.name}</p>
                        <p className="text-xs text-gray-500">{review.date}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, index) => (
                          <Star
                            key={index}
                            className={`h-4 w-4 ${index < review.rating ? 'fill-current text-yellow-400' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-gray-900">{review.title}</p>
                    <p className="mt-2 text-sm text-gray-600">{review.comment}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Share your experience</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700" htmlFor={`${productSlug}-review-name`}>
                    Name
                  </label>
                  <input
                    id={`${productSlug}-review-name`}
                    type="text"
                    required
                    value={formState.name}
                    onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700" htmlFor={`${productSlug}-review-email`}>
                    Email
                  </label>
                  <input
                    id={`${productSlug}-review-email`}
                    type="email"
                    required
                    value={formState.email}
                    onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Rating</label>
                <div className="mt-2 flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setFormState((prev) => ({ ...prev, rating }))}
                      className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${
                        formState.rating >= rating
                          ? 'border-pink-400 bg-pink-400 text-white'
                          : 'border-gray-300 text-gray-600 hover:border-pink-400'
                      }`}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700" htmlFor={`${productSlug}-review-title`}>
                  Review title
                </label>
                <input
                  id={`${productSlug}-review-title`}
                  type="text"
                  required
                  value={formState.title}
                  onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700" htmlFor={`${productSlug}-review-comment`}>
                  Review
                </label>
                <textarea
                  id={`${productSlug}-review-comment`}
                  required
                  value={formState.comment}
                  onChange={(event) => setFormState((prev) => ({ ...prev, comment: event.target.value }))}
                  className="mt-1 h-32 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-full bg-pink-400 px-6 py-3 text-sm font-semibold text-white transition hover:bg-pink-500"
              >
                Submit review
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};
