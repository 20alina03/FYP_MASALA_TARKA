import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { mongoClient } from '@/lib/mongodb-client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, MapPin, Clock, DollarSign, Filter, ArrowLeft, Phone, Navigation as NavigationIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import ReviewCard from '@/components/ReviewCard';
import CreateReviewModal from '@/components/CreateReviewModal';
import MenuItemCard from '@/components/MenuItemCard';
import RestaurantNavigation from '@/components/RestaurantNavigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const RestaurantDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [menuReviews, setMenuReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState([100000]); // High default to show all items
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [showReviewModal, setShowReviewModal] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const isFromSuperAdmin = searchParams.get('from') === 'superadmin';
  const isSuperAdminUser = user?.email === 'alinarafiq0676@gmail.com';

  useEffect(() => {
    fetchRestaurantDetails();
  }, [id]);

  // Filter and sort menu items when filters change
  useEffect(() => {
    if (!restaurant?.menu_items) return;
    
    let items = [...restaurant.menu_items];
    
    // Apply budget filter
    if (budget[0] < 100000) {
      items = items.filter((item: any) => item.price <= budget[0]);
    }
    
    // Apply category filter
    if (selectedCategory !== 'all') {
      items = items.filter((item: any) => item.category === selectedCategory);
    }
    
    // Apply sorting
    if (sortBy === 'price_low') {
      items.sort((a: any, b: any) => a.price - b.price);
    } else if (sortBy === 'price_high') {
      items.sort((a: any, b: any) => b.price - a.price);
    } else if (sortBy === 'rating') {
      items.sort((a: any, b: any) => b.rating - a.rating);
    } else if (sortBy === 'discount') {
      items.sort((a: any, b: any) => (b.discount_percentage || 0) - (a.discount_percentage || 0));
    } else {
      // Default 'popular' sort - by rating and review count
      items.sort((a: any, b: any) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return b.review_count - a.review_count;
      });
    }
    
    setMenuItems(items);
  }, [restaurant, budget, selectedCategory, sortBy]);

  const fetchRestaurantDetails = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching restaurant details for ID:', id);
      
      // Use direct fetch instead of mongoClient
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/restaurants/${id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Restaurant not found');
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Restaurant data received:', data);
      console.log('📋 Menu items count:', data.menu_items?.length || 0);
      
      if (!data) {
        throw new Error('No data received');
      }

      // Set all data
      setRestaurant(data);
      setMenuItems(data.menu_items || []);
      setReviews(data.recent_reviews || []);
      
      // Fetch menu reviews separately
      try {
        const menuReviewsResponse = await fetch(
          `http://localhost:5000/api/restaurants/${id}/menu-reviews`,
          {
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
          }
        );
        
        if (menuReviewsResponse.ok) {
          const menuReviewsData = await menuReviewsResponse.json();
          setMenuReviews(menuReviewsData || []);
        }
      } catch (reviewError) {
        console.log('⚠️ Menu reviews fetch failed (non-critical)');
        setMenuReviews([]);
      }
      
    } catch (error: any) {
      console.error('❌ Fetch restaurant error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load restaurant details",
        variant: "destructive"
      });
      if (error.message !== 'Restaurant not found') {
        setRestaurant(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const openInMaps = () => {
    if (restaurant?.latitude && restaurant?.longitude) {
      const lat = restaurant.latitude;
      const lng = restaurant.longitude;
      const name = encodeURIComponent(restaurant.name);
      
      // Simple and effective: search for name at exact coordinates
      const url = `https://www.google.com/maps/search/${name}/@${lat},${lng},17z`;
      
      window.open(url, '_blank');
    } else if (restaurant?.address && restaurant?.city) {
      const fullAddress = `${restaurant.name}, ${restaurant.address}, ${restaurant.city}, Pakistan`;
      const encodedAddress = encodeURIComponent(fullAddress);
      const url = `https://www.google.com/maps/search/${encodedAddress}`;
      window.open(url, '_blank');
    } else {
      toast({
        title: "Location unavailable",
        description: "This restaurant doesn't have location information",
        variant: "destructive"
      });
    }
  };
  
  const categories = [...new Set(menuItems.map(item => item.category))];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <RestaurantNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="bg-muted h-64 rounded-lg"></div>
            <div className="bg-muted h-8 rounded w-1/2"></div>
            <div className="bg-muted h-4 rounded w-1/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-background">
        <RestaurantNavigation />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground text-lg">Restaurant not found</p>
          <Button
            onClick={() =>
              navigate(isFromSuperAdmin ? '/superadmin-dashboard?tab=restaurants' : '/restaurants')
            }
            className="mt-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {isFromSuperAdmin ? 'Back to Super Admin' : 'Back to Discovery'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <RestaurantNavigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() =>
            navigate(isFromSuperAdmin ? '/superadmin-dashboard?tab=restaurants' : '/restaurants')
          }
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {isFromSuperAdmin ? 'Back to Super Admin' : 'Back to Discovery'}
        </Button>

        {/* Restaurant Header */}
        <Card className="mb-8">
          {restaurant.image_url && (
            <div className="aspect-[21/9] overflow-hidden rounded-t-lg">
              <img
                src={restaurant.image_url}
                alt={restaurant.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-2">{restaurant.name}</h1>
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <MapPin className="w-4 h-4" />
                  <span>{restaurant.address}, {restaurant.city}</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {restaurant.cuisine_types?.map((cuisine: string, idx: number) => (
                    <Badge key={idx} variant="secondary">{cuisine}</Badge>
                  ))}
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-lg">
                  <Star className="w-6 h-6 text-yellow-500 fill-current" />
                  <div>
                    <span className="text-2xl font-bold">{restaurant.rating.toFixed(1)}</span>
                    <p className="text-xs text-muted-foreground">{restaurant.review_count} reviews</p>
                  </div>
                </div>
                {user && (
                  <Button onClick={() => setShowReviewModal(true)} size="sm">
                    Write Review
                  </Button>
                )}
              </div>
            </div>

            {restaurant.description && (
              <p className="text-muted-foreground mb-4">{restaurant.description}</p>
            )}

            {/* Quick Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {restaurant.delivery_time && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Clock className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Delivery Time</p>
                    <p className="font-semibold text-sm">{restaurant.delivery_time}</p>
                  </div>
                </div>
              )}
              {restaurant.delivery_fee !== undefined && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <DollarSign className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Delivery Fee</p>
                    <p className="font-semibold text-sm">Rs. {restaurant.delivery_fee}</p>
                  </div>
                </div>
              )}
              {restaurant.contact_number && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Phone className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Contact</p>
                    <p className="font-semibold text-sm">{restaurant.contact_number}</p>
                  </div>
                </div>
              )}
              {restaurant.latitude && restaurant.longitude && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={openInMaps}
                    className="w-full justify-start p-0"
                  >
                    <NavigationIcon className="w-5 h-5 text-primary mr-2" />
                    <div className="text-left">
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="font-semibold text-sm">Get Directions</p>
                    </div>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Content Tabs */}
        <Tabs defaultValue="menu" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="menu">
              Menu ({menuItems.length})
            </TabsTrigger>
            <TabsTrigger value="restaurant-reviews">
              Restaurant Reviews ({reviews.length})
            </TabsTrigger>
            <TabsTrigger value="dish-reviews">
              Dish Reviews ({menuReviews.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="menu" className="space-y-6">
            {/* Menu Filters */}
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Filter className="w-5 h-5 text-primary" />
                    Filters & Sorting
                  </h3>
                </div>

                {/* Budget Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    Budget Filter: Rs. {budget[0].toLocaleString()} {budget[0] >= 100000 && '(All items)'}
                  </label>
                  <Slider
                    value={budget}
                    onValueChange={setBudget}
                    max={100000}
                    min={200}
                    step={100}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Rs. 200</span>
                    <span>Rs. 100,000+</span>
                  </div>
                </div>

                {/* Category and Sort */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="popular">Most Popular</SelectItem>
                      <SelectItem value="rating">Highest Rated</SelectItem>
                      <SelectItem value="price_low">Price: Low to High</SelectItem>
                      <SelectItem value="price_high">Price: High to Low</SelectItem>
                      <SelectItem value="discount">Highest Discount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Menu Items */}
            {restaurant.menu_items && restaurant.menu_items.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">
                  This restaurant doesn't have menu items yet.
                </p>
              </Card>
            ) : menuItems.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">
                  No items found within your budget or selected filters.
                </p>
                <Button 
                  onClick={() => {
                    setBudget([100000]);
                    setSelectedCategory('all');
                  }}
                  className="mt-4"
                >
                  Reset Filters
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {menuItems.map((item) => (
                  <MenuItemCard
                    key={item._id}
                    menuItem={item}
                    restaurantId={id!}
                    onReviewAdded={fetchRestaurantDetails}
                  canSuperAdminEdit={isSuperAdminUser && !restaurant.admin_id}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="restaurant-reviews" className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Restaurant Reviews</h2>
              {user && (
                <Button onClick={() => setShowReviewModal(true)}>
                  Write Review
                </Button>
              )}
            </div>

            {reviews.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No reviews yet. Be the first to review!</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <ReviewCard
                    key={review._id}
                    review={review}
                    restaurantId={id!}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="dish-reviews" className="space-y-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold">Dish Reviews</h2>
              <p className="text-muted-foreground">Reviews for individual menu items</p>
            </div>

            {menuReviews.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">
                  No dish reviews yet. Order a dish and share your experience!
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {menuReviews.map((review) => (
                  <Card key={review._id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold">{review.user_name || 'Anonymous'}</span>
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
                          <p className="text-sm font-medium text-primary mb-1">
                            Dish: {review.menu_item_name || 'Unknown Dish'}
                          </p>
                          <p className="text-sm text-muted-foreground mb-2">
                            {new Date(review.created_at).toLocaleDateString()}
                          </p>
                          {review.review_text && (
                            <p className="text-sm mb-2">{review.review_text}</p>
                          )}
                          {review.images && review.images.length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {review.images.map((img: string, idx: number) => (
                                <img
                                  key={idx}
                                  src={img}
                                  alt="Review"
                                  className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80"
                                  onClick={() => window.open(img, '_blank')}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Review Modal */}
      <CreateReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        restaurantId={id!}
        onReviewCreated={() => {
          setShowReviewModal(false);
          fetchRestaurantDetails();
        }}
      />
    </div>
  );
};

export default RestaurantDetail;