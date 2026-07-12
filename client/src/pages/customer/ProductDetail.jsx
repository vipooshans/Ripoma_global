import React, { useState, useEffect, useContext } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import storefrontService from '../../services/storefront.service';
import { useStorefront } from '../../components/storefront/CustomerStorefrontLayout';
import { CustomerAuthContext } from '../../context/CustomerAuthContext';
import ProductCard from '../../components/storefront/ProductCard';
import CustomerFooter from '../../components/storefront/CustomerFooter';
import StarRating from '../../components/storefront/StarRating';
import { formatPrice } from '../../utils/formatPrice';
import { isInWishlist, toggleWishlist } from '../../utils/wishlist';
import {
  Home, ChevronRight, Package, ShoppingCart, ShieldCheck, Heart,
  Loader2, ArrowLeft, Star, Minus, Plus, Truck, ChevronDown, BadgeCheck, Trash2
} from 'lucide-react';

const CustomerProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, setCartOpen } = useStorefront();
  const { isAuthenticated } = useContext(CustomerAuthContext);

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({ average: 0, count: 0 });
  const [distribution, setDistribution] = useState({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [reviews, setReviews] = useState([]);
  const [myReview, setMyReview] = useState(null);
  const [editingReview, setEditingReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadReviews = async (productId) => {
    try {
      const data = await storefrontService.getProductReviews(productId);
      setReviews(data.reviews || []);
      if (data.summary) setReviewSummary(data.summary);
      if (data.distribution) setDistribution(data.distribution);
      setMyReview(data.myReview || null);
      if (data.myReview) {
        setReviewForm({
          rating: data.myReview.rating || 5,
          title: data.myReview.title || '',
          comment: data.myReview.comment || ''
        });
        setEditingReview(false);
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await storefrontService.getProductDetail(id);
        setProduct(data.product);
        setRelated(data.related || []);
        setReviewSummary(data.reviewSummary || { average: 0, count: 0 });
        setActiveImage(0);
        setQty(1);
        setWishlisted(isInWishlist(data.product.id));
        await loadReviews(id);
      } catch (err) {
        if (err.response?.status === 404) {
          toast.error('Product not found.');
          navigate('/customer/products');
        } else {
          toast.error('Failed to load product.');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  useEffect(() => {
    if (id) loadReviews(id);
  }, [id, isAuthenticated]);

  useEffect(() => {
    const sync = () => {
      if (product?.id) setWishlisted(isInWishlist(product.id));
    };
    window.addEventListener('wishlist-updated', sync);
    return () => window.removeEventListener('wishlist-updated', sync);
  }, [product?.id]);

  const inStock = product?.totalStock > 0;
  const maxQty = inStock ? Math.min(product.totalStock, 99) : 1;

  const handleAdd = () => {
    if (!product || !inStock) return;
    addToCart(product, true, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
    toast.success(`Added ${qty} to cart`);
  };

  const handleBuyNow = () => {
    if (!product || !inStock) return;
    addToCart(product, false, qty);
    if (!isAuthenticated) {
      navigate('/customer/login', {
        state: { from: { pathname: `/customer/products/${product.id}` } }
      });
      return;
    }
    setCartOpen(true);
  };

  const handleWishlist = () => {
    if (!product) return;
    const { added: wasAdded } = toggleWishlist(product);
    setWishlisted(wasAdded);
    toast.success(wasAdded ? 'Added to wishlist' : 'Removed from wishlist');
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/customer/login', {
        state: { from: { pathname: `/customer/products/${id}` } }
      });
      return;
    }
    try {
      setSubmittingReview(true);
      if (myReview) {
        const data = await storefrontService.updateMyProductReview(id, reviewForm);
        toast.success(data.message || 'Review updated');
      } else {
        const data = await storefrontService.createProductReview(id, reviewForm);
        toast.success(data.message || 'Review submitted');
      }
      setEditingReview(false);
      await loadReviews(id);
      const detail = await storefrontService.getProductDetail(id);
      setReviewSummary(detail.reviewSummary || { average: 0, count: 0 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!myReview) return;
    try {
      setSubmittingReview(true);
      await storefrontService.deleteMyProductReview(id);
      toast.success('Review deleted');
      setMyReview(null);
      setReviewForm({ rating: 5, title: '', comment: '' });
      setEditingReview(false);
      await loadReviews(id);
      const detail = await storefrontService.getProductDetail(id);
      setReviewSummary(detail.reviewSummary || { average: 0, count: 0 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 gap-2">
        <Loader2 size={20} className="animate-spin text-teal-500" />
        <span className="text-sm font-medium">Loading product...</span>
      </div>
    );
  }

  if (!product) return null;

  const images = product.images?.length ? product.images : [];
  const dims = product.dimensions;
  const dimLabel =
    dims && (dims.length || dims.width || dims.height)
      ? `${dims.length || 0} × ${dims.width || 0} × ${dims.height || 0} cm`
      : null;

  const specs = [
    { label: 'SKU', value: product.sku },
    { label: 'Brand', value: product.brand },
    { label: 'Category', value: product.category?.name },
    { label: 'Unit', value: product.unit },
    { label: 'Weight', value: product.weight ? `${product.weight} kg` : null },
    { label: 'Dimensions', value: dimLabel },
    { label: 'Country of Origin', value: product.countryOfOrigin },
    { label: 'HS Code', value: product.hsCode }
  ].filter((s) => s.value);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2 text-xs text-slate-400 w-full flex-wrap">
        <Link to="/customer" className="hover:text-teal-600 transition-colors flex items-center gap-1">
          <Home size={11} /> Home
        </Link>
        <ChevronRight size={11} />
        <Link to="/customer/products" className="hover:text-teal-600 transition-colors">Products</Link>
        {product.category && (
          <>
            <ChevronRight size={11} />
            <Link
              to={`/customer/products?category=${product.category.id}`}
              className="hover:text-teal-600 transition-colors"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight size={11} />
        <span className="text-teal-600 font-bold line-clamp-1">{product.name}</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-12 flex-1 w-full">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-teal-600 mb-6 transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Gallery */}
          <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
              <div className="aspect-square bg-gradient-to-br from-slate-50 to-teal-50/30 flex items-center justify-center">
                {images[activeImage] ? (
                  <img
                    src={images[activeImage]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package size={64} className="text-slate-300" />
                )}
              </div>
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((src, idx) => (
                  <button
                    key={src + idx}
                    type="button"
                    onClick={() => setActiveImage(idx)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                      activeImage === idx ? 'border-teal-500 ring-2 ring-teal-500/20' : 'border-slate-200 hover:border-teal-300'
                    }`}
                  >
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Purchase panel */}
          <div className="space-y-4">
            {product.brand && (
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{product.brand}</p>
            )}
            {product.category && (
              <Link
                to={`/customer/products?category=${product.category.id}`}
                className="text-[10px] font-bold text-teal-600 uppercase tracking-wider hover:underline"
              >
                {product.category.name}
              </Link>
            )}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{product.name}</h1>
            <p className="text-xs text-slate-400 font-mono">SKU: {product.sku}</p>

            <a href="#reviews" className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity">
              <StarRating rating={reviewSummary.average || 0} />
              <span className="text-xs text-slate-500 font-medium">
                {reviewSummary.count > 0
                  ? `${reviewSummary.average} (${reviewSummary.count} review${reviewSummary.count !== 1 ? 's' : ''})`
                  : 'No reviews yet'}
              </span>
            </a>

            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                inStock ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}>
                {inStock ? 'In Stock' : 'Out of Stock'}
              </span>
              {inStock && (
                <span className="text-xs text-slate-500">{product.totalStock} available</span>
              )}
            </div>

            <div>
              <p className="text-3xl font-extrabold text-slate-900">{formatPrice(product.sellingPrice, product.currency)}</p>
              <p className="text-xs text-slate-400 mt-0.5">per {product.unit}</p>
            </div>

            {product.description && (
              <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">{product.description}</p>
            )}

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-600">Qty</span>
              <div className="flex items-center border border-slate-200 rounded-xl bg-white overflow-hidden">
                <button
                  type="button"
                  disabled={!inStock || qty <= 1}
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="p-2.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <span className="w-10 text-center text-sm font-bold text-slate-800">{qty}</span>
                <button
                  type="button"
                  disabled={!inStock || qty >= maxQty}
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                  className="p-2.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  aria-label="Increase quantity"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                onClick={handleAdd}
                disabled={!inStock}
                className={`inline-flex items-center gap-2 font-bold px-6 py-3 rounded-xl transition-all text-sm ${
                  inStock
                    ? added
                      ? 'bg-emerald-500 text-white'
                      : 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm shadow-teal-500/20'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                {added ? <><ShieldCheck size={16} /> Added!</> : <><ShoppingCart size={16} /> Add to Cart</>}
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={!inStock}
                className={`inline-flex items-center gap-2 font-bold px-6 py-3 rounded-xl transition-all text-sm border ${
                  inStock
                    ? 'border-teal-600 text-teal-700 hover:bg-teal-50'
                    : 'border-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Buy Now
              </button>
              <button
                type="button"
                onClick={handleWishlist}
                className={`inline-flex items-center gap-2 font-bold px-4 py-3 rounded-xl transition-all text-sm border ${
                  wishlisted
                    ? 'border-rose-200 bg-rose-50 text-rose-600'
                    : 'border-slate-200 text-slate-600 hover:border-rose-200 hover:text-rose-500'
                }`}
                aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart size={16} className={wishlisted ? 'fill-rose-500' : ''} />
                Wishlist
              </button>
            </div>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <section className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm mb-6">
            <h2 className="text-lg font-extrabold text-slate-800 mb-3">Description</h2>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{product.description}</p>
          </section>
        )}

        {/* Specs */}
        {specs.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm mb-6">
            <h2 className="text-lg font-extrabold text-slate-800 mb-4">Specifications</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {specs.map((s) => (
                <div key={s.label} className="flex justify-between gap-4 border-b border-slate-50 pb-2">
                  <dt className="text-xs font-bold text-slate-500">{s.label}</dt>
                  <dd className="text-xs font-semibold text-slate-800 text-right">{s.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* Shipping */}
        <section className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm mb-6">
          <h2 className="text-lg font-extrabold text-slate-800 mb-3 flex items-center gap-2">
            <Truck size={18} className="text-teal-600" /> Shipping Details
          </h2>
          <ul className="space-y-2 text-sm text-slate-600">
            {product.countryOfOrigin && (
              <li>Ships from / origin: <strong className="text-slate-800">{product.countryOfOrigin}</strong></li>
            )}
            {product.weight > 0 && (
              <li>Approx. shipping weight: <strong className="text-slate-800">{product.weight} kg</strong></li>
            )}
            <li>Orders typically process within 1–2 business days</li>
            <li>International freight options available at checkout</li>
            <li>Tracking provided once the shipment is dispatched</li>
          </ul>
        </section>

        {/* FAQs */}
        {product.faqs?.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm mb-6">
            <h2 className="text-lg font-extrabold text-slate-800 mb-4">FAQs</h2>
            <div className="space-y-2">
              {product.faqs.map((faq, idx) => (
                <div key={idx} className="border border-slate-100 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm font-bold text-slate-800 hover:bg-slate-50"
                  >
                    {faq.question}
                    <ChevronDown
                      size={16}
                      className={`text-slate-400 shrink-0 transition-transform ${openFaq === idx ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {openFaq === idx && (
                    <div className="px-4 pb-3 text-sm text-slate-600 leading-relaxed border-t border-slate-50 pt-2">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Reviews */}
        <section id="reviews" className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm mb-6 scroll-mt-24">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">Reviews</h2>
              <div className="flex items-center gap-2 mt-1">
                <StarRating rating={reviewSummary.average || 0} />
                <span className="text-xs text-slate-500">
                  {reviewSummary.count > 0
                    ? `${reviewSummary.average} average · ${reviewSummary.count} review${reviewSummary.count !== 1 ? 's' : ''}`
                    : 'No reviews yet'}
                </span>
              </div>
            </div>
          </div>

          {reviewSummary.count > 0 && (
            <div className="mb-8 max-w-md space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = distribution[star] || 0;
                const pct = reviewSummary.count ? Math.round((count / reviewSummary.count) * 100) : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-[11px]">
                    <span className="w-8 text-slate-500 font-semibold">{star}★</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-right text-slate-400">{count}</span>
                  </div>
                );
              })}
            </div>
          )}

          {reviews.length > 0 ? (
            <div className="space-y-4 mb-8">
              {reviews.map((r) => (
                <div key={r.id} className="border border-slate-100 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <StarRating rating={r.rating} size={12} />
                    <span className="text-[10px] text-slate-400">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {r.title && <p className="text-sm font-bold text-slate-800">{r.title}</p>}
                  <p className="text-sm text-slate-600 mt-1">{r.comment}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-[10px] text-slate-400 font-medium">{r.customerName}</p>
                    {r.verifiedPurchase && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5">
                        <BadgeCheck size={10} /> Verified purchase
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 mb-8">No reviews yet. Be the first to share your experience.</p>
          )}

          {isAuthenticated ? (
            <div className="border-t border-slate-100 pt-6 space-y-3 max-w-lg">
              {myReview && !editingReview ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-extrabold text-slate-800">Your review</h3>
                  <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <StarRating rating={myReview.rating} size={12} />
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          myReview.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : myReview.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {myReview.status === 'pending' ? 'Awaiting moderation' : myReview.status}
                      </span>
                    </div>
                    {myReview.title && <p className="text-sm font-bold text-slate-800">{myReview.title}</p>}
                    <p className="text-sm text-slate-600 mt-1">{myReview.comment}</p>
                  </div>
                  {myReview.status !== 'rejected' ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingReview(true)}
                        className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteReview}
                        disabled={submittingReview}
                        className="inline-flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleDeleteReview}
                      disabled={submittingReview}
                      className="inline-flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                    >
                      <Trash2 size={12} /> Remove and write a new review
                    </button>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmitReview} className="space-y-3">
                  <h3 className="text-sm font-extrabold text-slate-800">
                    {myReview ? 'Edit your review' : 'Write a review'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Reviews appear after staff approval. Minimum 20 characters.
                  </p>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rating</label>
                    <div className="flex gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setReviewForm((f) => ({ ...f, rating: n }))}
                          className="p-0.5"
                          aria-label={`${n} stars`}
                        >
                          <Star
                            size={20}
                            className={n <= reviewForm.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Title (optional)"
                    maxLength={120}
                    value={reviewForm.title}
                    onChange={(e) => setReviewForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
                  />
                  <textarea
                    required
                    rows={3}
                    minLength={20}
                    maxLength={2000}
                    placeholder="Your review (min 20 characters)"
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl disabled:opacity-50"
                    >
                      {submittingReview ? 'Saving…' : myReview ? 'Save changes' : 'Submit Review'}
                    </button>
                    {myReview && editingReview && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingReview(false);
                          setReviewForm({
                            rating: myReview.rating || 5,
                            title: myReview.title || '',
                            comment: myReview.comment || ''
                          });
                        }}
                        className="text-sm font-bold px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500 border-t border-slate-100 pt-6">
              <Link to="/customer/login" state={{ from: { pathname: `/customer/products/${id}` } }} className="font-bold text-teal-600 hover:underline">
                Sign in
              </Link>
              {' '}to leave a review.
            </p>
          )}
        </section>

        {related.length > 0 && (
          <section>
            <h2 className="text-lg font-extrabold text-slate-800 mb-4">Related Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} onAddToCart={(prod) => addToCart(prod, false)} />
              ))}
            </div>
          </section>
        )}
      </div>

      <CustomerFooter />
    </div>
  );
};

export default CustomerProductDetail;
