import { useState } from 'react';
import { mongoClient } from '@/lib/mongodb-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AdminRequestFormProps {
  onSuccess: () => void;
}

const AdminRequestForm = ({ onSuccess }: AdminRequestFormProps) => {
  const [formData, setFormData] = useState({
    restaurant_name: '',
    contact_number: '',
    address: '',
    city: '',
    latitude: '',
    longitude: '',
    description: '',
    cuisine_types:  ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React. FormEvent) => {
    e.preventDefault();
    
    if (!formData.restaurant_name || !formData.contact_number || !formData.address || !formData.city) {
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
        ...formData,
        latitude: formData.latitude ?  parseFloat(formData.latitude) : 0,
        longitude: formData.longitude ? parseFloat(formData.longitude) : 0,
        cuisine_types: formData.cuisine_types. split(',').map(c => c.trim()).filter(c => c)
      };

      const { data, error } = await mongoClient.request('/restaurants/admin/request', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (error) throw error;

      toast({
        title: "Request submitted! ",
        description: "Your admin request has been submitted for review"
      });

      onSuccess();
    } catch (error:  any) {
      console.error('Submit request error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit request",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="restaurant_name">Restaurant Name *</Label>
        <Input
          id="restaurant_name"
          value={formData.restaurant_name}
          onChange={(e) => setFormData({ ...formData, restaurant_name: e.target.value })}
          placeholder="Enter restaurant name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact_number">Contact Number *</Label>
        <Input
          id="contact_number"
          value={formData.contact_number}
          onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
          placeholder="Enter contact number"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address *</Label>
        <Input
          id="address"
          value={formData. address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Enter full address"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            value={formData. city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder="Enter city"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cuisine_types">Cuisine Types (comma-separated)</Label>
          <Input
            id="cuisine_types"
            value={formData.cuisine_types}
            onChange={(e) => setFormData({ ...formData, cuisine_types: e.target.value })}
            placeholder="e.g., Italian, Chinese"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md: grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="latitude">Latitude (optional)</Label>
          <Input
            id="latitude"
            type="number"
            step="any"
            value={formData. latitude}
            onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
            placeholder="e.g., 40.7128"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="longitude">Longitude (optional)</Label>
          <Input
            id="longitude"
            type="number"
            step="any"
            value={formData.longitude}
            onChange={(e) => setFormData({ ... formData, longitude: e.target.value })}
            placeholder="e.g., -74.0060"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ... formData, description: e.target.value })}
          placeholder="Tell us about your restaurant"
          rows={4}
        />
      </div>

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          'Submit Request'
        )}
      </Button>
    </form>
  );
};

export default AdminRequestForm;