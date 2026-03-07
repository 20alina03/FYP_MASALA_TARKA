import { useState, useEffect } from 'react';
import { mongoClient } from '@/lib/mongodb-client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Store, Menu, Star, AlertCircle, Plus, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MenuItemManagement from '@/components/admin/MenuItemManagement';
import ReviewManagement from '@/components/admin/ReviewManagement';
import AdminRequestForm from '@/components/admin/AdminRequestForm';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [adminStatus, setAdminStatus] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [menuReviews, setMenuReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMenuItems: 0,
    totalReviews: 0,
    averageRating: 0,
    reportedReviews: 0
  });

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (adminStatus?. status === 'approved' && adminStatus. restaurant_id) {
      fetchRestaurantData();
    }
  }, [adminStatus]);

  const checkAdminStatus = async () => {
    try {
      setLoading(true);
      const { data, error } = await mongoClient.request('/restaurants/admin/status');
      
      if (error) throw error;
      
      setAdminStatus(data);
    } catch (error: any) {
      console.error('Check admin status error:', error);
      toast({
        title: "Error",
        description: "Failed to check admin status",
        variant:  "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRestaurantData = async () => {
    try {
      const { data, error } = await mongoClient. request('/restaurants/admin/my-restaurant');
      
      if (error) throw error;
      
      setRestaurant(data. restaurant);
      setMenuItems(data.menu_items || []);
      setReviews(data.reviews || []);
      setMenuReviews(data.menu_reviews || []);
      
      // Calculate stats
      const totalReviews = (data.reviews?. length || 0) + (data.menu_reviews?.length || 0);
      const avgRating = totalReviews > 0 
        ? ([...data.reviews, ...data.menu_reviews].reduce((sum, r) => sum + r.rating, 0) / totalReviews)
        : 0;
      
      setStats({
        totalMenuItems: data.menu_items?.length || 0,
        totalReviews,
        averageRating: avgRating,
        reportedReviews: [... data.reviews, ...data.menu_reviews].filter(r => r.is_reported).length
      });
    } catch (error: any) {
      console.error('Fetch restaurant data error:', error);
      toast({
        title: "Error",
        description: "Failed to load restaurant data",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="bg-muted h-32 rounded-lg"></div>
          <div className="bg-muted h-64 rounded-lg"></div>
        </div>
      </div>
    );
  }

  // No admin request yet
  if (!adminStatus || adminStatus.status === 'none') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Become a Restaurant Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              Apply to manage your restaurant on our platform.  You'll be able to add menu items, 
              manage reviews, and engage with customers.
            </p>
            <AdminRequestForm onSuccess={checkAdminStatus} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pending approval
  if (adminStatus.status === 'pending') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto text-center p-12">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Request Pending</h2>
          <p className="text-muted-foreground mb-4">
            Your restaurant admin request is being reviewed by our team.
          </p>
          <div className="bg-muted p-4 rounded-lg text-left">
            <h3 className="font-semibold mb-2">Restaurant Details: </h3>
            <p><strong>Name:</strong> {adminStatus.restaurant_name}</p>
            <p><strong>Address:</strong> {adminStatus.address}</p>
            <p><strong>City:</strong> {adminStatus.city}</p>
            <p><strong>Contact:</strong> {adminStatus.contact_number}</p>
          </div>
        </Card>
      </div>
    );
  }

  // Rejected
  if (adminStatus.status === 'rejected') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto text-center p-12">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Request Rejected</h2>
          <p className="text-muted-foreground mb-4">
            Unfortunately, your restaurant admin request was not approved.
          </p>
          <p className="text-sm text-muted-foreground">
            Please contact support for more information.
          </p>
        </Card>
      </div>
    );
  }

  // Approved - Show Dashboard
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Restaurant Admin Dashboard</h1>
        <p className="text-muted-foreground text-lg">
          Manage {restaurant?. name}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Menu Items</p>
                <p className="text-3xl font-bold">{stats. totalMenuItems}</p>
              </div>
              <Menu className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
                <p className="text-3xl font-bold">{stats.totalReviews}</p>
              </div>
              <Star className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Rating</p>
                <p className="text-3xl font-bold">{stats.averageRating. toFixed(1)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reported</p>
                <p className="text-3xl font-bold">{stats.reportedReviews}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="menu" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="menu">Menu Management</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="restaurant">Restaurant Info</TabsTrigger>
        </TabsList>

        <TabsContent value="menu">
          <MenuItemManagement
            restaurantId={restaurant._id}
            menuItems={menuItems}
            onUpdate={fetchRestaurantData}
          />
        </TabsContent>

        <TabsContent value="reviews">
          <ReviewManagement
            restaurantId={restaurant._id}
            reviews={reviews}
            menuReviews={menuReviews}
            onUpdate={fetchRestaurantData}
          />
        </TabsContent>

        <TabsContent value="restaurant">
          <Card>
            <CardHeader>
              <CardTitle>Restaurant Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="text-lg font-semibold">{restaurant. name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="text-lg">{restaurant. address}, {restaurant.city}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contact</p>
                <p className="text-lg">{restaurant. contact_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cuisine Types</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {restaurant.cuisine_types?.map((cuisine:  string, idx: number) => (
                    <Badge key={idx}>{cuisine}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-lg">{restaurant. description}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;