import { useState, useEffect } from 'react';
import { mongoClient } from '@/lib/mongodb-client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Loader2, Upload, X } from 'lucide-react';

interface EditMenuItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItem: any;
  onSuccess: () => void;
}

const EditMenuItemModal = ({ isOpen, onClose, menuItem, onSuccess }: EditMenuItemModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    dietary_tags: '',
    image_url: '',
    is_available: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState('');

  const categories = ['Appetizers', 'Main Course', 'Desserts', 'Beverages', 'Sides', 'Salads', 'Soups'];

  useEffect(() => {
    if (menuItem) {
      setFormData({
        name: menuItem.name || '',
        description: menuItem.description || '',
        category: menuItem.category || '',
        price: menuItem.original_price?.toString() || menuItem.price?.toString() || '',
        dietary_tags: menuItem.dietary_tags?.join(', ') || '',
        image_url: menuItem.image_url || '',
        is_available: menuItem.is_available !== false
      });
      setImagePreview(menuItem.image_url || '');
    }
  }, [menuItem]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setFormData({ ...formData, image_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.category || !formData.price) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        price: parseFloat(formData.price),
        original_price: menuItem.discount_percentage > 0 ? parseFloat(formData.price) : null,
        dietary_tags: formData.dietary_tags.split(',').map(t => t.trim()).filter(t => t),
        image_url: formData.image_url || null,
        is_available: formData.is_available
      };

      const { error } = await mongoClient.request(`/restaurants/admin/menu/${menuItem._id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Menu item updated successfully"
      });

      onSuccess();
    } catch (error: any) {
      console.error('Update menu item error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update menu item",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Menu Item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Image</Label>
            <div className="border-2 border-dashed rounded-lg p-4">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setImagePreview('');
                      setFormData({ ...formData, image_url: '' });
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="edit-menu-image-upload"
                  />
                  <Label
                    htmlFor="edit-menu-image-upload"
                    className="cursor-pointer inline-block mt-2 px-4 py-2 border rounded-md hover:bg-accent"
                  >
                    Choose Image
                  </Label>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter item name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the menu item"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price (PKR) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                  Rs.
                </span>
                <Input
                  id="price"
                  type="number"
                  step="1"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0"
                  className="pl-9"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dietary_tags">Dietary Tags (comma-separated)</Label>
            <Input
              id="dietary_tags"
              value={formData.dietary_tags}
              onChange={(e) => setFormData({ ...formData, dietary_tags: e.target.value })}
              placeholder="e.g., vegetarian, vegan, gluten-free"
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="is_available">Available for Order</Label>
              <p className="text-sm text-muted-foreground">
                Toggle to mark item as available or unavailable
              </p>
            </div>
            <Switch
              id="is_available"
              checked={formData.is_available}
              onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Item'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditMenuItemModal;