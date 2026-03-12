import { useState, useEffect } from 'react';
import { mongoClient } from '@/lib/mongodb-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Store, Star, MapPin, Phone, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AllRestaurantsManagement = () => {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    address: '',
    city: '',
    contact_number: '',
    description: '',
    cuisine_types: '',
    image: '',
  });
  const [editingRestaurant, setEditingRestaurant] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    address: '',
    city: '',
    contact_number: '',
    description: '',
    cuisine_types: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchRestaurants();
  }, [page]);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const data = await mongoClient.request(
        `/restaurants/superadmin/all-restaurants?page=${page}&limit=10`
      );
      if (Array.isArray(data)) {
        // Backward compatibility: endpoint returns plain array
        setRestaurants(data);
        setTotalPages(1);
      } else {
        setRestaurants(Array.isArray(data.restaurants) ? data.restaurants : []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error:  any) {
      console.error('Fetch restaurants error:', error);
      toast({
        title:  "Error",
        description: "Failed to load restaurants",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredRestaurants = restaurants.filter(restaurant => {
    if (!searchTerm) return true;
    return restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           restaurant. city.toLowerCase().includes(searchTerm.toLowerCase()) ||
           restaurant.admin_id?.email?. toLowerCase().includes(searchTerm. toLowerCase());
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse bg-muted h-32 rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" />
              All Restaurants ({restaurants.length})
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search restaurants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
                Add Restaurant
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredRestaurants.map((restaurant) => (
              <Card key={restaurant._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-start gap-4 mb-3">
                        {restaurant.image_url && (
                          <img
                            src={restaurant.image_url}
                            alt={restaurant.name}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold mb-2">{restaurant.name}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{restaurant.city}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              <span>{restaurant.rating?. toFixed(1) || '0.0'}</span>
                              <span>({restaurant.review_count || 0} reviews)</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {restaurant.cuisine_types?. map((cuisine:  string, idx: number) => (
                              <Badge key={idx} variant="secondary">{cuisine}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Admin</p>
                          <p className="font-semibold">{restaurant.admin_id?.email || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Contact</p>
                          <p className="font-semibold">{restaurant.contact_number || 'N/A'}</p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-muted-foreground">Address</p>
                          <p className="font-semibold">{restaurant.address}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate(`/restaurants/${restaurant._id}?from=superadmin`)
                        }
                      >
                        View Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingRestaurant(restaurant);
                          setEditForm({
                            name: restaurant.name || '',
                            address: restaurant.address || '',
                            city: restaurant.city || '',
                            contact_number: restaurant.contact_number || '',
                            description: restaurant.description || '',
                            cuisine_types: Array.isArray(restaurant.cuisine_types)
                              ? restaurant.cuisine_types.join(', ')
                              : '',
                          });
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          if (
                            !window.confirm(
                              `Are you sure you want to delete "${restaurant.name}" and all its data?`,
                            )
                          ) {
                            return;
                          }
                          try {
                            await mongoClient.request(
                              `/restaurants/superadmin/restaurants/${restaurant._id}`,
                              {
                                method: 'DELETE',
                              },
                            );
                            toast({
                              title: 'Restaurant deleted',
                              description:
                                'The restaurant and all related data have been removed.',
                            });
                            // If this page is now empty and not the first page, go back one page
                            if (restaurants.length === 1 && page > 1) {
                              setPage(prev => prev - 1);
                            } else {
                              fetchRestaurants();
                            }
                          } catch (error: any) {
                            console.error('Delete restaurant error:', error);
                            toast({
                              title: 'Error',
                              description:
                                error?.error || error?.message || 'Failed to delete restaurant',
                              variant: 'destructive',
                            });
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>

          {filteredRestaurants.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchTerm ? 'No restaurants found matching your search' : 'No restaurants yet'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Restaurant Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add New Restaurant</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="space-y-4 p-1 pr-3">
              <div className="space-y-2">
                <Label htmlFor="create-name">Name *</Label>
                <Input
                  id="create-name"
                  value={createForm.name}
                  onChange={e =>
                    setCreateForm(f => ({ ...f, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-address">Address *</Label>
                <Input
                  id="create-address"
                  value={createForm.address}
                  onChange={e =>
                    setCreateForm(f => ({ ...f, address: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-city">City *</Label>
                <Input
                  id="create-city"
                  value={createForm.city}
                  onChange={e =>
                    setCreateForm(f => ({ ...f, city: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-contact">Contact Number</Label>
                <Input
                  id="create-contact"
                  value={createForm.contact_number}
                  onChange={e =>
                    setCreateForm(f => ({
                      ...f,
                      contact_number: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-cuisines">
                  Cuisine Types (comma-separated)
                </Label>
                <Input
                  id="create-cuisines"
                  value={createForm.cuisine_types}
                  onChange={e =>
                    setCreateForm(f => ({
                      ...f,
                      cuisine_types: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-description">Description</Label>
                <Textarea
                  id="create-description"
                  rows={3}
                  value={createForm.description}
                  onChange={e =>
                    setCreateForm(f => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-image">Restaurant Image</Label>
                {createForm.image && (
                  <div className="mb-2">
                    <img
                      src={createForm.image}
                      alt="Preview"
                      className="w-full max-h-48 object-cover rounded"
                    />
                  </div>
                )}
                <Input
                  id="create-image"
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setCreateForm(f => ({
                        ...f,
                        image: reader.result as string,
                      }));
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              disabled={
                creating ||
                !createForm.name.trim() ||
                !createForm.address.trim() ||
                !createForm.city.trim()
              }
              onClick={async () => {
                setCreating(true);
                try {
                  const payload = {
                    name: createForm.name.trim(),
                    address: createForm.address.trim(),
                    city: createForm.city.trim(),
                    contact_number: createForm.contact_number.trim(),
                    description: createForm.description.trim(),
                    cuisine_types: createForm.cuisine_types
                      .split(',')
                      .map(c => c.trim())
                      .filter(Boolean),
                    image_url: createForm.image || undefined,
                  };
                  await mongoClient.request('/restaurants/superadmin/restaurants', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                  });
                  toast({
                    title: 'Restaurant created',
                    description: 'The new restaurant has been added.',
                  });
                  setShowCreateDialog(false);
                  setCreateForm({
                    name: '',
                    address: '',
                    city: '',
                    contact_number: '',
                    description: '',
                    cuisine_types: '',
                    image: '',
                  });
                  // Go back to first page to show the newest restaurant
                  setPage(1);
                  fetchRestaurants();
                } catch (error: any) {
                  console.error('Create restaurant error:', error);
                  toast({
                    title: 'Error',
                    description:
                      error?.error || error?.message || 'Failed to create restaurant',
                    variant: 'destructive',
                  });
                } finally {
                  setCreating(false);
                }
              }}
            >
              {creating ? 'Creating...' : 'Create Restaurant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Restaurant Dialog */}
      <Dialog open={!!editingRestaurant} onOpenChange={open => !open && setEditingRestaurant(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Restaurant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={editForm.address}
                onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-city">City</Label>
              <Input
                id="edit-city"
                value={editForm.city}
                onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-contact">Contact Number</Label>
              <Input
                id="edit-contact"
                value={editForm.contact_number}
                onChange={e => setEditForm(f => ({ ...f, contact_number: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cuisines">Cuisine Types (comma-separated)</Label>
              <Input
                id="edit-cuisines"
                value={editForm.cuisine_types}
                onChange={e => setEditForm(f => ({ ...f, cuisine_types: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                rows={3}
                value={editForm.description}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setEditingRestaurant(null)}
              disabled={savingEdit}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!editingRestaurant) return;
                setSavingEdit(true);
                try {
                  const payload = {
                    ...editForm,
                    cuisine_types: editForm.cuisine_types
                      .split(',')
                      .map(c => c.trim())
                      .filter(Boolean),
                  };
                  await mongoClient.request(
                    `/restaurants/superadmin/restaurants/${editingRestaurant._id}`,
                    {
                      method: 'PUT',
                      body: JSON.stringify(payload),
                    },
                  );
                  toast({
                    title: 'Restaurant updated',
                    description: 'The restaurant details have been saved.',
                  });
                  setEditingRestaurant(null);
                  fetchRestaurants();
                } catch (error: any) {
                  console.error('Update restaurant error:', error);
                  toast({
                    title: 'Error',
                    description:
                      error?.error || error?.message || 'Failed to update restaurant details',
                    variant: 'destructive',
                  });
                } finally {
                  setSavingEdit(false);
                }
              }}
              disabled={savingEdit}
            >
              {savingEdit ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AllRestaurantsManagement;