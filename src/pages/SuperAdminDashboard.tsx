import { useState, useEffect } from 'react';
import { mongoClient } from '@/lib/mongodb-client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Store, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminRequestsManagement from '@/components/superadmin/AdminRequestsManagement';
import AllRestaurantsManagement from '@/components/superadmin/AllRestaurantsManagement';
import ReportsManagement from '@/components/superadmin/ReportsManagement';
import RestaurantNavigation from '@/components/RestaurantNavigation';

const RestaurantSuperAdmin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState({
    pendingRequests: 0,
    totalRestaurants: 0,
    pendingReports: 0,
    totalAdmins: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requests' | 'restaurants' | 'reports'>('requests');

  useEffect(() => {
    // Initialize active tab from query parameter if present
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab') as 'requests' | 'restaurants' | 'reports' | null;
    if (tab) {
      setActiveTab(tab);
    }
  }, [location.search]);

  useEffect(() => {
    if (user?.email !== 'alinarafiq0676@gmail.com') {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page",
        variant: "destructive"
      });
      navigate('/restaurants');
      return;
    }
    
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      const [requestsRes, restaurantsRes, reportsRes] = await Promise.all([
        mongoClient.request('/restaurants/superadmin/requests'),
        mongoClient.request('/restaurants/superadmin/all-restaurants'),
        mongoClient. request('/restaurants/superadmin/reports')
      ]);

      const requests = Array.isArray(requestsRes) ? requestsRes : [];
      const restaurantsData = restaurantsRes as any;

const restaurants = Array.isArray(restaurantsRes)
  ? restaurantsRes
  : Array.isArray(restaurantsData?.restaurants)
    ? restaurantsData.restaurants
    : [];

const totalRestaurants =
  typeof restaurantsData?.total === 'number'
    ? restaurantsData.total
    : restaurants.length;

setStats({
  pendingRequests: requests.filter((r: any) => r.status === 'pending').length || 0,
  totalRestaurants,
  pendingReports: reportsRes.filter((r: any) => r.status === 'pending').length || 0,
  totalAdmins: requests.filter((r: any) => r.status === 'approved').length || 0,
});
    } catch (error:  any) {
      console.error('Fetch stats error:', error);
      toast({
        title: "Error",
        description: "Failed to load statistics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <RestaurantNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="bg-muted h-32 rounded-lg"></div>
            <div className="bg-muted h-64 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <RestaurantNavigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
            Super Admin Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage all restaurants, admins, and platform content
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Requests</p>
                  <p className="text-3xl font-bold">{stats. pendingRequests}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Restaurants</p>
                  <p className="text-3xl font-bold">{stats.totalRestaurants}</p>
                </div>
                <Store className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Admins</p>
                  <p className="text-3xl font-bold">{stats. totalAdmins}</p>
                </div>
                <Users className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Reports</p>
                  <p className="text-3xl font-bold">{stats.pendingReports}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'requests' | 'restaurants' | 'reports')}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="requests">
              Admin Requests
              {stats.pendingRequests > 0 && (
                <span className="ml-2 bg-yellow-500 text-white rounded-full px-2 py-0.5 text-xs">
                  {stats.pendingRequests}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="restaurants">All Restaurants</TabsTrigger>
            <TabsTrigger value="reports">
              Reports
              {stats.pendingReports > 0 && (
                <span className="ml-2 bg-red-500 text-white rounded-full px-2 py-0.5 text-xs">
                  {stats.pendingReports}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
            <AdminRequestsManagement onUpdate={fetchStats} />
          </TabsContent>

          <TabsContent value="restaurants">
            <AllRestaurantsManagement />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsManagement onUpdate={fetchStats} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RestaurantSuperAdmin;