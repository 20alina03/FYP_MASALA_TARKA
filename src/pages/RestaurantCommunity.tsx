import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MapPin, Star, Search, UtensilsCrossed, Store, ThumbsUp, ThumbsDown, Minus, AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import RestaurantNavigation from '@/components/RestaurantNavigation';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Review {
  _id: string;
  restaurant_id: any;
  restaurant_name?: string;
  restaurant_cuisines?: string[];
  restaurant_location?: string;
  menu_item_name?: string;
  user_name: string;
  rating: number;
  review_text?: string;
  images?: string[];
  created_at: string;
  review_type: 'restaurant' | 'menu_item';
  // AI fields
  sentiment?: 'positive' | 'negative' | 'neutral';
  sentiment_score?: number;
  sentiment_confidence?: number;
  is_fake_suspected?: boolean;
  fake_score?: number;
  fake_signals?: string[];
  original_language?: string;
  translated_text?: string;
  ai_analyzed?: boolean;
}

const RestaurantCommunity = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.email === 'alinarafiq0676@gmail.com';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const linkedRestaurantId = searchParams.get('restaurantId') || '';
  const linkedRestaurantName = searchParams.get('restaurantName') || '';
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [menuItemSearch, setMenuItemSearch] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('all');
  const [reviewType, setReviewType] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');

  const cuisines = ['Italian', 'Indian', 'Japanese', 'Mediterranean', 'American', 'Mexican', 'Thai', 'Chinese', 'Korean', 'Pakistani'];
  const locations = ['Gulberg', 'DHA', 'Johar Town', 'Model Town', 'Bahria Town', 'Liberty'];

  useEffect(() => {
    fetchReviews();
  }, []);

  useEffect(() => {
    if (linkedRestaurantName) {
      setRestaurantSearch(linkedRestaurantName);
    }
  }, [linkedRestaurantName]);

  // Reset menu item search when restaurant search is cleared
  useEffect(() => {
    if (!restaurantSearch.trim()) {
      setMenuItemSearch('');
    }
  }, [restaurantSearch]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const [restaurantReviewsRes, menuReviewsRes] = await Promise.all([
        fetch('http://localhost:5000/api/restaurants/all-reviews', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        }),
        fetch('http://localhost:5000/api/restaurants/all-menu-reviews', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        })
      ]);

      const restaurantReviews = restaurantReviewsRes.ok ? await restaurantReviewsRes.json() : [];
      const menuReviews = menuReviewsRes.ok ? await menuReviewsRes.json() : [];

      const formattedRestaurantReviews = restaurantReviews
        .filter((r: any) => r.review_text && r.review_text.trim().length > 0)
        .map((r: any) => ({
          ...r,
          review_type: 'restaurant' as const,
          restaurant_name: r.restaurant_id?.name || 'Unknown Restaurant',
          restaurant_cuisines: r.restaurant_id?.cuisines || r.restaurant_id?.cuisine_types || [],
          restaurant_location: [
            r.restaurant_id?.address || '',
            r.restaurant_id?.address_line2 || '',
            r.restaurant_id?.city || ''
          ].join(' ')
        }));

      const formattedMenuReviews = menuReviews
        .filter((r: any) => r.review_text && r.review_text.trim().length > 0)
        .map((r: any) => ({
          ...r,
          review_type: 'menu_item' as const,
          restaurant_name: r.restaurant_id?.name || 'Unknown Restaurant',
          menu_item_name: r.menu_item_id?.name || 'Unknown Dish',
          restaurant_cuisines: r.restaurant_id?.cuisines || r.restaurant_id?.cuisine_types || [],
          restaurant_location: [
            r.restaurant_id?.address || '',
            r.restaurant_id?.address_line2 || '',
            r.restaurant_id?.city || ''
          ].join(' ')
        }));

      const allReviews = [...formattedRestaurantReviews, ...formattedMenuReviews]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // DEBUG — remove after confirming location filter works
      if (allReviews.length > 0) {
        console.log('[DEBUG] Sample review restaurant_id raw:', allReviews[0]?.restaurant_id);
        console.log('[DEBUG] Sample restaurant_location built:', allReviews[0]?.restaurant_location);
        console.log('[DEBUG] All unique locations:', [...new Set(allReviews.map((r: any) => r.restaurant_location))]);
      }
      setReviews(allReviews);
    } catch (error: any) {
      console.error('Fetch reviews error:', error);
      toast({
        title: "Error",
        description: "Failed to load community reviews",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestaurantClick = (restaurantId: string) => {
    if (restaurantId) {
      navigate(`/restaurants/${restaurantId}`);
    }
  };

  const handleDeleteReview = async (review: Review) => {
    if (!confirm('Delete this review permanently? This cannot be undone.')) return;
    try {
      const endpoint = review.review_type === 'menu_item'
        ? `/restaurants/superadmin/community-menu-reviews/${review._id}`
        : `/restaurants/superadmin/community-reviews/${review._id}`;
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete');
      }
      toast({ title: 'Deleted', description: 'Review removed successfully' });
      setReviews(prev => prev.filter(r => r._id !== review._id));
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete review', variant: 'destructive' });
    }
  };

  const filteredReviews = reviews.filter(review => {
    const reviewRestaurantId = (review.restaurant_id?._id || review.restaurant_id || '').toString();

    if (linkedRestaurantId && reviewRestaurantId !== linkedRestaurantId) {
      return false;
    }

    const restaurantSearchLower = restaurantSearch.trim().toLowerCase();
    const menuItemSearchLower = menuItemSearch.trim().toLowerCase();

    // --- Restaurant search logic ---
    if (restaurantSearchLower) {
      const matchesRestaurant = review.restaurant_name?.toLowerCase().includes(restaurantSearchLower);
      if (!matchesRestaurant) return false;

      // If restaurant is matched and menu item search is active,
      // only show menu_item reviews matching the dish name
      if (menuItemSearchLower) {
        if (review.review_type !== 'menu_item') return false;
        const matchesMenuItem = review.menu_item_name?.toLowerCase().includes(menuItemSearchLower);
        if (!matchesMenuItem) return false;
      }
    } else {
      // No restaurant searched — if menu item search is active, search all menu item reviews
      if (menuItemSearchLower) {
        if (review.review_type !== 'menu_item') return false;
        const matchesMenuItem = review.menu_item_name?.toLowerCase().includes(menuItemSearchLower);
        if (!matchesMenuItem) return false;
      }
    }

    // Review type filter
    if (reviewType !== 'all') {
      if (reviewType === 'restaurant' && review.review_type !== 'restaurant') return false;
      if (reviewType === 'menu_item' && review.review_type !== 'menu_item') return false;
    }

    // Cuisine filter — match against restaurant's cuisines array
    if (selectedCuisine !== 'all') {
      const cuisines = review.restaurant_cuisines || [];
      const matches = cuisines.some((c: string) =>
        c.toLowerCase() === selectedCuisine.toLowerCase()
      );
      if (!matches) return false;
    }

    // Location filter — search across address, address_line2, and city
    if (selectedLocation !== 'all') {
      const locationText = review.restaurant_location || '';
      const matches = locationText.toLowerCase().includes(selectedLocation.toLowerCase());
      if (!matches) return false;
    }

    return true;
  });

  // Derive matched restaurant names for the hint label
  const matchedRestaurants = restaurantSearch.trim()
    ? [...new Set(
        reviews
          .filter((r: Review) => r.restaurant_name?.toLowerCase().includes(restaurantSearch.trim().toLowerCase()))
          .map((r: Review) => r.restaurant_name)
      )]
    : [];

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.floor(months / 12);
    return `${years}y ago`;
  };

  return (
    <div className="min-h-screen bg-background">
      <RestaurantNavigation />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Restaurant Community
          </h1>
          <p className="text-muted-foreground text-lg">
            Discover reviews and ratings from the community
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-8 p-6">
          <div className="space-y-4">

            {/* Two Search Bars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Restaurant Search */}
              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                  <Store className="w-3.5 h-3.5" />
                  Search Restaurant
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="e.g. Pizza Palace, Burger Barn..."
                    value={restaurantSearch}
                    onChange={(e) => setRestaurantSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {matchedRestaurants.length > 0 && restaurantSearch.trim() && (
                  <p className="text-xs text-muted-foreground">
                    Showing results for: {matchedRestaurants.slice(0, 3).join(', ')}
                    {matchedRestaurants.length > 3 && ` +${matchedRestaurants.length - 3} more`}
                  </p>
                )}
              </div>

              {/* Menu Item Search */}
              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                  <UtensilsCrossed className="w-3.5 h-3.5" />
                  Search Dish
                  {restaurantSearch.trim() && matchedRestaurants.length > 0 && (
                    <Badge variant="secondary" className="text-xs ml-1">
                      within matched restaurants
                    </Badge>
                  )}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder={
                      restaurantSearch.trim()
                        ? `Search dishes in matched restaurants...`
                        : 'Search all dishes across restaurants...'
                    }
                    value={menuItemSearch}
                    onChange={(e) => setMenuItemSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {!restaurantSearch.trim() && menuItemSearch.trim() && (
                  <p className="text-xs text-muted-foreground">
                    Searching dishes across all restaurants
                  </p>
                )}
              </div>
            </div>

            {/* Other filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select value={reviewType} onValueChange={setReviewType}>
                <SelectTrigger>
                  <SelectValue placeholder="Review Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reviews</SelectItem>
                  <SelectItem value="restaurant">Restaurant Reviews</SelectItem>
                  <SelectItem value="menu_item">Dish Reviews</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedCuisine === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCuisine('all')}
              >
                All Cuisines
              </Button>
              {cuisines.map((cuisine) => (
                <Button
                  key={cuisine}
                  variant={selectedCuisine === cuisine ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCuisine(cuisine)}
                >
                  {cuisine}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* Active Search Summary */}
        {(restaurantSearch.trim() || menuItemSearch.trim() || linkedRestaurantId) && (
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {linkedRestaurantId && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Store className="w-3 h-3" />
                Restaurant only: {linkedRestaurantName || 'Selected restaurant'}
                <button
                  onClick={() => navigate('/restaurant-community')}
                  className="ml-1 hover:text-destructive transition-colors"
                >
                  ×
                </button>
              </Badge>
            )}
            {restaurantSearch.trim() && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Store className="w-3 h-3" />
                Restaurant: "{restaurantSearch}"
                <button
                  onClick={() => setRestaurantSearch('')}
                  className="ml-1 hover:text-destructive transition-colors"
                >
                  ×
                </button>
              </Badge>
            )}
            {menuItemSearch.trim() && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <UtensilsCrossed className="w-3 h-3" />
                Dish: "{menuItemSearch}"
                <button
                  onClick={() => setMenuItemSearch('')}
                  className="ml-1 hover:text-destructive transition-colors"
                >
                  ×
                </button>
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              ({filteredReviews.length} result{filteredReviews.length !== 1 ? 's' : ''})
            </span>
          </div>
        )}

        {/* Reviews Feed */}
        {loading ? (
          <div className="space-y-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted h-64 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : filteredReviews.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground text-lg">
              {restaurantSearch.trim() || menuItemSearch.trim()
                ? 'No reviews match your search. Try different keywords.'
                : 'No reviews found. Be the first to review!'}
            </p>
            {(restaurantSearch.trim() || menuItemSearch.trim()) ? (
              <Button
                variant="outline"
                onClick={() => { setRestaurantSearch(''); setMenuItemSearch(''); }}
                className="mt-4"
              >
                Clear Search
              </Button>
            ) : (
              <Button onClick={() => navigate('/restaurants')} className="mt-4">
                Discover Restaurants
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredReviews.map((review: Review) => (
              <Card
                key={review._id}
                className={`overflow-hidden hover:shadow-lg transition-shadow ${
                  review.is_fake_suspected ? 'border-yellow-400 border-2' : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {review.user_name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold">{review.user_name || 'Anonymous'}</span>
                        <Badge variant="outline" className="text-xs">
                          {review.review_type === 'restaurant' ? 'Restaurant' : 'Dish'} Review
                        </Badge>

                        {/* Sentiment badge — always show on analyzed reviews */}
                        {review.ai_analyzed && review.sentiment && (
                          <Badge
                            className={`text-xs flex items-center gap-1 ${
                              review.sentiment === 'positive'
                                ? 'bg-green-100 text-green-800 border-green-300'
                                : review.sentiment === 'negative'
                                ? 'bg-red-100 text-red-800 border-red-300'
                                : 'bg-gray-100 text-gray-700 border-gray-300'
                            }`}
                            variant="outline"
                          >
                            {review.sentiment === 'positive' && <ThumbsUp className="w-3 h-3" />}
                            {review.sentiment === 'negative' && <ThumbsDown className="w-3 h-3" />}
                            {review.sentiment === 'neutral' && <Minus className="w-3 h-3" />}
                            {review.sentiment.charAt(0).toUpperCase() + review.sentiment.slice(1)}
                          </Badge>
                        )}

                        {/* Suspicious badge — only show when flagged */}
                        {review.is_fake_suspected && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1 bg-yellow-50 text-yellow-800 border-yellow-400">
                            <AlertTriangle className="w-3 h-3" />
                            Suspicious Review
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span
                          className="hover:text-primary cursor-pointer font-medium"
                          onClick={() => handleRestaurantClick(review.restaurant_id?._id || review.restaurant_id)}
                        >
                          {review.restaurant_name}
                        </span>
                        {review.menu_item_name && (
                          <>
                            <span>•</span>
                            <span className="italic">{review.menu_item_name}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{formatTimeAgo(review.created_at)}</span>
                      </div>
                    </div>
                    {review.rating > 0 && (
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {/* Fake review warning banner */}
                  {review.is_fake_suspected && (
                    <div className="mb-3 flex items-start gap-2 rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 text-xs text-yellow-800">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium">This review may not be genuine.</span>
                        {review.fake_signals && review.fake_signals.length > 0 && (
                          <span className="ml-1 opacity-80">Reasons: {review.fake_signals.join(', ')}.</span>
                        )}
                      </div>
                    </div>
                  )}

                  {review.review_text && (
                    <p className="mb-2 whitespace-pre-wrap text-sm">{review.review_text}</p>
                  )}

                  {review.images && review.images.length > 0 && (
                    <div className="flex gap-2 mb-4 overflow-x-auto">
                      {review.images.map((img: string, idx: number) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Review ${idx + 1}`}
                          className="w-32 h-32 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => window.open(img, '_blank')}
                        />
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRestaurantClick(review.restaurant_id?._id || review.restaurant_id)}
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>Visit Restaurant</span>
                    </Button>
                    {isSuperAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteReview(review)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Review
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantCommunity;