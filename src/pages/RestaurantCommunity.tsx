import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MapPin, Star, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import RestaurantNavigation from '@/components/RestaurantNavigation';
import { useNavigate } from 'react-router-dom';
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
  menu_item_name?: string;
  user_name: string;
  rating: number;
  review_text?: string;
  images?: string[];
  created_at: string;
  review_type: 'restaurant' | 'menu_item';
}

const RestaurantCommunity = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('all');
  const [reviewType, setReviewType] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');

  const cuisines = ['Italian', 'Indian', 'Japanese', 'Mediterranean', 'American', 'Mexican', 'Thai', 'Chinese', 'Korean', 'Pakistani'];
  const locations = ['Gulberg', 'DHA', 'Johar Town', 'Model Town', 'Bahria Town', 'Liberty'];

  useEffect(() => {
    fetchReviews();
  }, [selectedCuisine, reviewType]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      
      // Fetch both restaurant and menu item reviews
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

      // Combine and format reviews
      const formattedRestaurantReviews = restaurantReviews.map((r: any) => ({
        ...r,
        review_type: 'restaurant' as const,
        restaurant_name: r.restaurant_id?.name || 'Unknown Restaurant'
      }));

      const formattedMenuReviews = menuReviews.map((r: any) => ({
        ...r,
        review_type: 'menu_item' as const,
        restaurant_name: r.restaurant_id?.name || 'Unknown Restaurant',
        menu_item_name: r.menu_item_id?.name || 'Unknown Dish'
      }));

      const allReviews = [...formattedRestaurantReviews, ...formattedMenuReviews]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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

  const filteredReviews = reviews.filter(review => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        review.restaurant_name?.toLowerCase().includes(searchLower) ||
        review.menu_item_name?.toLowerCase().includes(searchLower) ||
        review.review_text?.toLowerCase().includes(searchLower) ||
        review.user_name?.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    // Review type filter
    if (reviewType !== 'all') {
      if (reviewType === 'restaurant' && review.review_type !== 'restaurant') return false;
      if (reviewType === 'menu_item' && review.review_type !== 'menu_item') return false;
    }

    return true;
  });

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search reviews, restaurants, dishes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

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
              No reviews found. Be the first to review!
            </p>
            <Button 
              onClick={() => navigate('/restaurants')}
              className="mt-4"
            >
              Discover Restaurants
            </Button>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredReviews.map((review) => (
              <Card key={review._id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {review.user_name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{review.user_name || 'Anonymous'}</span>
                        <Badge variant="outline" className="text-xs">
                          {review.review_type === 'restaurant' ? 'Restaurant' : 'Dish'} Review
                        </Badge>
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
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {/* Review Text */}
                  {review.review_text && (
                    <p className="mb-4 whitespace-pre-wrap text-sm">{review.review_text}</p>
                  )}

                  {/* Images */}
                  {review.images && review.images.length > 0 && (
                    <div className="flex gap-2 mb-4 overflow-x-auto">
                      {review.images.map((img, idx) => (
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

                  {/* Actions */}
                  <div className="flex items-center gap-4 pt-4 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRestaurantClick(review.restaurant_id?._id || review.restaurant_id)}
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>Visit Restaurant</span>
                    </Button>
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