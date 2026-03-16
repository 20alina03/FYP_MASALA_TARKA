import { useState, useEffect } from 'react';
import { mongoClient } from '@/lib/mongodb-client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Store, Menu, Star, AlertCircle, Plus, TrendingUp, Pencil, X, Check, PlusCircle } from 'lucide-react';
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

  // Password state
  const [newPassword, setNewPassword] = useState('');

  // Restaurant edit state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [savingField, setSavingField] = useState<string | null>(null);
  const [newCuisine, setNewCuisine] = useState('');

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (adminStatus?.status === 'approved' && adminStatus.restaurant_id) {
      fetchRestaurantData();
    }
  }, [adminStatus]);

  // Sync editValues when restaurant loads
  useEffect(() => {
    if (restaurant) {
      setEditValues({
        name: restaurant.name || '',
        contact_number: restaurant.contact_number || '',
        address: restaurant.address || '',
        city: restaurant.city || '',
        description: restaurant.description || '',
        cuisine_types: restaurant.cuisine_types ? [...restaurant.cuisine_types] : [],
      });
    }
  }, [restaurant]);

  const checkAdminStatus = async () => {
    try {
      setLoading(true);
      const data = await mongoClient.request('/restaurants/admin/status');
      setAdminStatus(data);
    } catch (error: any) {
      console.error('Check admin status error:', error);
      toast({
        title: "Error",
        description: "Failed to check admin status",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRestaurantData = async () => {
    try {
      const data = await mongoClient.request('/restaurants/admin/my-restaurant');
      setRestaurant(data.restaurant);
      setMenuItems(data.menu_items || []);
      setReviews(data.reviews || []);
      setMenuReviews(data.menu_reviews || []);

      const totalReviews = (data.reviews?.length || 0) + (data.menu_reviews?.length || 0);
      const avgRating = totalReviews > 0
        ? ([...data.reviews, ...data.menu_reviews].reduce((sum: number, r: any) => sum + r.rating, 0) / totalReviews)
        : 0;

      setStats({
        totalMenuItems: data.menu_items?.length || 0,
        totalReviews,
        averageRating: avgRating,
        reportedReviews: [...data.reviews, ...data.menu_reviews].filter((r: any) => r.is_reported).length
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

  const handleChangePassword = async () => {
    try {
      if (!newPassword) return;
      await mongoClient.request('/restaurants/admin/change-password', {
        method: 'POST',
        body: JSON.stringify({ password: newPassword }),
      });
      toast({ title: "Success", description: "Password updated successfully" });
      setNewPassword('');
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to update password", variant: "destructive" });
    }
  };

  // Save a single editable field (or combined address+city)
  const handleSaveField = async (field: string) => {
    try {
      setSavingField(field);
      let payload: any = {};

      if (field === 'address') {
        payload = { address: editValues.address, city: editValues.city };
      } else if (field === 'cuisine_types') {
        payload = { cuisine_types: editValues.cuisine_types };
      } else {
        payload = { [field]: editValues[field] };
      }

      await mongoClient.request('/restaurants/admin/update', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      // Update local restaurant state
      setRestaurant((prev: any) => ({ ...prev, ...payload }));
      setEditingField(null);
      toast({ title: "Saved", description: "Restaurant info updated." });
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to save changes.", variant: "destructive" });
    } finally {
      setSavingField(null);
    }
  };

  const handleCancelEdit = (field: string) => {
    // Reset to current restaurant value
    if (field === 'address') {
      setEditValues((prev: any) => ({
        ...prev,
        address: restaurant?.address || '',
        city: restaurant?.city || '',
      }));
    } else if (field === 'cuisine_types') {
      setEditValues((prev: any) => ({
        ...prev,
        cuisine_types: restaurant?.cuisine_types ? [...restaurant.cuisine_types] : [],
      }));
    } else {
      setEditValues((prev: any) => ({ ...prev, [field]: restaurant?.[field] || '' }));
    }
    setEditingField(null);
    setNewCuisine('');
  };

  const handleAddCuisine = () => {
    const trimmed = newCuisine.trim();
    if (!trimmed) return;
    if (editValues.cuisine_types.includes(trimmed)) return;
    setEditValues((prev: any) => ({
      ...prev,
      cuisine_types: [...prev.cuisine_types, trimmed],
    }));
    setNewCuisine('');
  };

  const handleRemoveCuisine = (cuisine: string) => {
    setEditValues((prev: any) => ({
      ...prev,
      cuisine_types: prev.cuisine_types.filter((c: string) => c !== cuisine),
    }));
  };

  // A reusable inline-edit row
  const EditableField = ({
    label,
    fieldKey,
    multiline = false,
  }: {
    label: string;
    fieldKey: string;
    multiline?: boolean;
  }) => {
    const isEditing = editingField === fieldKey;
    const isSaving = savingField === fieldKey;

    return (
      <div className="group flex items-start justify-between gap-4 py-3 border-b last:border-b-0">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
          {isEditing ? (
            multiline ? (
              <textarea
                className="w-full border rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
                value={editValues[fieldKey] || ''}
                onChange={(e) => setEditValues((prev: any) => ({ ...prev, [fieldKey]: e.target.value }))}
                autoFocus
              />
            ) : (
              <input
                type="text"
                className="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={editValues[fieldKey] || ''}
                onChange={(e) => setEditValues((prev: any) => ({ ...prev, [fieldKey]: e.target.value }))}
                autoFocus
              />
            )
          ) : (
            <p className="text-sm font-medium">{restaurant?.[fieldKey] || <span className="text-muted-foreground italic">Not set</span>}</p>
          )}
        </div>
        <div className="flex items-center gap-1 pt-5 shrink-0">
          {isEditing ? (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={() => handleSaveField(fieldKey)}
                disabled={isSaving}
                title="Save"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => handleCancelEdit(fieldKey)}
                disabled={isSaving}
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setEditingField(fieldKey)}
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Address+City combined editable row
  const AddressField = () => {
    const isEditing = editingField === 'address';
    const isSaving = savingField === 'address';

    return (
      <div className="group flex items-start justify-between gap-4 py-3 border-b last:border-b-0">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Address & City</p>
          {isEditing ? (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Address"
                className="flex-1 border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={editValues.address || ''}
                onChange={(e) => setEditValues((prev: any) => ({ ...prev, address: e.target.value }))}
                autoFocus
              />
              <input
                type="text"
                placeholder="City"
                className="w-32 border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={editValues.city || ''}
                onChange={(e) => setEditValues((prev: any) => ({ ...prev, city: e.target.value }))}
              />
            </div>
          ) : (
            <p className="text-sm font-medium">
              {restaurant?.address && restaurant?.city
                ? `${restaurant.address}, ${restaurant.city}`
                : restaurant?.address || restaurant?.city || <span className="text-muted-foreground italic">Not set</span>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 pt-5 shrink-0">
          {isEditing ? (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={() => handleSaveField('address')}
                disabled={isSaving}
                title="Save"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => handleCancelEdit('address')}
                disabled={isSaving}
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setEditingField('address')}
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Cuisine types editable row
  const CuisineField = () => {
    const isEditing = editingField === 'cuisine_types';
    const isSaving = savingField === 'cuisine_types';

    return (
      <div className="group flex items-start justify-between gap-4 py-3 border-b last:border-b-0">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Cuisine Types</p>
          {isEditing ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {editValues.cuisine_types?.map((cuisine: string) => (
                  <span
                    key={cuisine}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                  >
                    {cuisine}
                    <button
                      onClick={() => handleRemoveCuisine(cuisine)}
                      className="hover:text-red-500 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Add cuisine..."
                  className="border rounded-md p-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-40"
                  value={newCuisine}
                  onChange={(e) => setNewCuisine(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCuisine(); } }}
                />
                <Button size="sm" variant="outline" onClick={handleAddCuisine} className="h-8">
                  <PlusCircle className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 mt-1">
              {restaurant?.cuisine_types?.length
                ? restaurant.cuisine_types.map((c: string, i: number) => (
                    <Badge key={i} variant="secondary">{c}</Badge>
                  ))
                : <span className="text-sm text-muted-foreground italic">Not set</span>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 pt-5 shrink-0">
          {isEditing ? (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={() => handleSaveField('cuisine_types')}
                disabled={isSaving}
                title="Save"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => handleCancelEdit('cuisine_types')}
                disabled={isSaving}
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setEditingField('cuisine_types')}
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Read-only field
  const ReadOnlyField = ({ label, value }: { label: string; value?: string }) => (
    <div className="py-3 border-b last:border-b-0">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm font-medium">{value || <span className="text-muted-foreground italic">Not available</span>}</p>
    </div>
  );

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

  if (!adminStatus || adminStatus.status === 'none') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Become a Restaurant Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              Apply to manage your restaurant on our platform. You'll be able to add menu items,
              manage reviews, and engage with customers.
            </p>
            <AdminRequestForm onSuccess={checkAdminStatus} />
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <h3 className="font-semibold mb-2">Restaurant Details:</h3>
            <p><strong>Name:</strong> {adminStatus.restaurant_name}</p>
            <p><strong>Address:</strong> {adminStatus.address}</p>
            <p><strong>City:</strong> {adminStatus.city}</p>
            <p><strong>Contact:</strong> {adminStatus.contact_number}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (adminStatus.status === 'rejected') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto text-center p-12">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Request Rejected</h2>
          <p className="text-muted-foreground mb-4">
            Unfortunately, your restaurant admin request was not approved.
          </p>
          <p className="text-sm text-muted-foreground">Please contact support for more information.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Restaurant Admin Dashboard</h1>
        <p className="text-muted-foreground text-lg">Managed by {restaurant?.name}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Menu Items</p>
              <p className="text-3xl font-bold">{stats.totalMenuItems}</p>
            </div>
            <Menu className="w-8 h-8 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Reviews</p>
              <p className="text-3xl font-bold">{stats.totalReviews}</p>
            </div>
            <Star className="w-8 h-8 text-yellow-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Average Rating</p>
              <p className="text-3xl font-bold">{stats.averageRating.toFixed(1)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Reported</p>
              <p className="text-3xl font-bold">{stats.reportedReviews}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="menu" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="menu">Menu Management</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="restaurant">Restaurant Info</TabsTrigger>
          <TabsTrigger value="password">Change Password</TabsTrigger>
        </TabsList>

        <TabsContent value="menu">
          <MenuItemManagement
            restaurantId={restaurant?._id}
            menuItems={menuItems}
            onUpdate={fetchRestaurantData}
          />
        </TabsContent>

        <TabsContent value="reviews">
          <ReviewManagement
            restaurantId={restaurant?._id}
            reviews={reviews}
            menuReviews={menuReviews}
            onUpdate={fetchRestaurantData}
          />
        </TabsContent>
<TabsContent value="restaurant">
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Restaurant Information
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Hover over any editable field and click the pencil icon to edit.
              </p>
            </CardHeader>
            <CardContent className="pt-2">

              {/* Restaurant Name */}
              <EditableField label="Restaurant Name" fieldKey="name" />

              {/* Contact Number */}
              <EditableField label="Contact Number" fieldKey="contact_number" />

              {/* Address & City */}
              <div className="group flex items-start justify-between gap-4 py-3 border-b">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Address & City</p>
                  {editingField === 'address' ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Address"
                        className="flex-1 border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        value={editValues.address || ''}
                        onChange={(e) => setEditValues((prev: any) => ({ ...prev, address: e.target.value }))}
                        autoFocus
                      />
                      <input
                        type="text"
                        placeholder="City"
                        className="w-32 border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        value={editValues.city || ''}
                        onChange={(e) => setEditValues((prev: any) => ({ ...prev, city: e.target.value }))}
                      />
                    </div>
                  ) : (
                    <p className="text-sm font-medium">
                      {restaurant?.address && restaurant?.city
                        ? `${restaurant.address}, ${restaurant.city}`
                        : restaurant?.address || restaurant?.city || <span className="text-muted-foreground italic">Not set</span>}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 pt-5 shrink-0">
                  {editingField === 'address' ? (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:bg-green-50"
                        onClick={() => handleSaveField('address')} disabled={savingField === 'address'}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:bg-red-50"
                        onClick={() => handleCancelEdit('address')} disabled={savingField === 'address'}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button size="icon" variant="ghost"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setEditingField('address')}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Description */}
              <EditableField label="Description" fieldKey="description" multiline />

              {/* Cuisine Types — inlined to prevent remount on keystroke */}
              <div className="group flex items-start justify-between gap-4 py-3 border-b">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Cuisine Types</p>
                  {editingField === 'cuisine_types' ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {editValues.cuisine_types?.map((cuisine: string) => (
                          <span key={cuisine}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            {cuisine}
                            <button
                              type="button"
                              onClick={() =>
                                setEditValues((prev: any) => ({
                                  ...prev,
                                  cuisine_types: prev.cuisine_types.filter((c: string) => c !== cuisine),
                                }))
                              }
                              className="hover:text-red-500 transition-colors">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Add cuisine..."
                          className="border rounded-md p-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-40"
                          value={newCuisine}
                          onChange={(e) => setNewCuisine(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const trimmed = newCuisine.trim();
                              if (!trimmed || editValues.cuisine_types.includes(trimmed)) return;
                              setEditValues((prev: any) => ({
                                ...prev,
                                cuisine_types: [...prev.cuisine_types, trimmed],
                              }));
                              setNewCuisine('');
                            }
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() => {
                            const trimmed = newCuisine.trim();
                            if (!trimmed || editValues.cuisine_types.includes(trimmed)) return;
                            setEditValues((prev: any) => ({
                              ...prev,
                              cuisine_types: [...prev.cuisine_types, trimmed],
                            }));
                            setNewCuisine('');
                          }}>
                          <PlusCircle className="h-3.5 w-3.5 mr-1" /> Add
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {restaurant?.cuisine_types?.length
                        ? restaurant.cuisine_types.map((c: string, i: number) => (
                            <Badge key={i} variant="secondary">{c}</Badge>
                          ))
                        : <span className="text-sm text-muted-foreground italic">Not set</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 pt-5 shrink-0">
                  {editingField === 'cuisine_types' ? (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:bg-green-50"
                        onClick={() => handleSaveField('cuisine_types')} disabled={savingField === 'cuisine_types'}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:bg-red-50"
                        onClick={() => handleCancelEdit('cuisine_types')} disabled={savingField === 'cuisine_types'}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button size="icon" variant="ghost"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setEditingField('cuisine_types')}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Read-only fields */}
              <div className="py-3 border-b">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Government Registration Number</p>
                <p className="text-sm font-medium">
                  {restaurant?.government_registration_number || <span className="text-muted-foreground italic">Not available</span>}
                </p>
              </div>
              <div className="py-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">CNIC</p>
                <p className="text-sm font-medium">
                  {restaurant?.cnic || <span className="text-muted-foreground italic">Not available</span>}
                </p>
              </div>

            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="password">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <CardTitle>Change Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">New Password</label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  className="mt-1 block w-full border rounded-md p-2"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="flex justify-center">
                <Button onClick={handleChangePassword} disabled={!newPassword}>
                  Update Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;