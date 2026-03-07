import { useState } from 'react';
import { mongoClient } from '@/lib/mongodb-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, DollarSign, Percent } from 'lucide-react';
import CreateMenuItemModal from './CreateMenuItemModal';
import EditMenuItemModal from './EditMenuItemModal';
import DiscountModal from './DiscountModal';

interface MenuItemManagementProps {
  restaurantId: string;
  menuItems: any[];
  onUpdate:  () => void;
}

const MenuItemManagement = ({ restaurantId, menuItems, onUpdate }: MenuItemManagementProps) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [discountItem, setDiscountItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const categories = [... new Set(menuItems.map(item => item.category))];

  const handleDelete = async (itemId: string) => {
    if (! confirm('Are you sure you want to delete this menu item?')) return;

    try {
      const { error } = await mongoClient.request(`/restaurants/admin/menu/${itemId}`, {
        method: 'DELETE'
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Menu item deleted successfully"
      });

      onUpdate();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title:  "Error",
        description: error.message || "Failed to delete menu item",
        variant: "destructive"
      });
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = ! categoryFilter || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Menu Items ({menuItems.length})</CardTitle>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Menu Item
          </Button>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <Input
              placeholder="Search menu items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e. target.value)}
              className="flex-1"
            />
            <select
              className="px-4 py-2 border rounded-md"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <Card key={item._id} className="relative">
                {! item.is_available && (
                  <div className="absolute top-2 right-2 z-10">
                    <Badge variant="destructive">Unavailable</Badge>
                  </div>
                )}
                {item.discount_percentage > 0 && (
                  <div className="absolute top-2 left-2 z-10">
                    <Badge className="bg-green-500">
                      {item.discount_percentage}% OFF
                    </Badge>
                  </div>
                )}
                {item.image_url && (
                  <div className="aspect-video overflow-hidden rounded-t-lg">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-1">{item.name}</h4>
                  <Badge variant="outline" className="mb-2">{item.category}</Badge>
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {item.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    {item.original_price && item.original_price !== item.price ?  (
                      <>
                        <span className="text-lg font-bold text-green-600">
                          ${item.price. toFixed(2)}
                        </span>
                        <span className="text-sm text-muted-foreground line-through">
                          ${item.original_price.toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span className="text-lg font-bold">
                        ${item.price. toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingItem(item)}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDiscountItem(item)}
                      className="flex-1"
                    >
                      <Percent className="w-4 h-4 mr-1" />
                      Discount
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(item._id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No menu items found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateMenuItemModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        restaurantId={restaurantId}
        onSuccess={() => {
          setShowCreateModal(false);
          onUpdate();
        }}
      />

      {editingItem && (
        <EditMenuItemModal
          isOpen={!! editingItem}
          onClose={() => setEditingItem(null)}
          menuItem={editingItem}
          onSuccess={() => {
            setEditingItem(null);
            onUpdate();
          }}
        />
      )}

      {discountItem && (
        <DiscountModal
          isOpen={!!discountItem}
          onClose={() => setDiscountItem(null)}
          menuItem={discountItem}
          onSuccess={() => {
            setDiscountItem(null);
            onUpdate();
          }}
        />
      )}
    </div>
  );
};

export default MenuItemManagement;