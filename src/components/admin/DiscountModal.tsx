import { useState } from 'react';
import { mongoClient } from '@/lib/mongodb-client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/hooks/use-toast';
import { Loader2, Percent } from 'lucide-react';

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItem: any;
  onSuccess: () => void;
}

const DiscountModal = ({ isOpen, onClose, menuItem, onSuccess }: DiscountModalProps) => {
  const [discount, setDiscount] = useState([menuItem?.discount_percentage || 0]);
  const [submitting, setSubmitting] = useState(false);

  const originalPrice = menuItem?.original_price || menuItem?.price || 0;
  const discountedPrice = originalPrice * (1 - discount[0] / 100);

  const handleSubmit = async () => {
    setSubmitting(true);

    try {
      const { error } = await mongoClient.request(`/restaurants/admin/menu/${menuItem._id}/discount`, {
        method: 'POST',
        body: JSON.stringify({ discount_percentage: discount[0] })
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: discount[0] > 0 ? `${discount[0]}% discount applied` : "Discount removed"
      });

      onSuccess();
    } catch (error: any) {
      console.error('Apply discount error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to apply discount",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Apply Discount</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">{menuItem?.name}</h3>
            <p className="text-sm text-muted-foreground">
              Original Price: Rs. {Math.round(originalPrice)}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-primary" />
                Discount
              </Label>
              <span className="text-2xl font-bold text-primary">
                {discount[0]}%
              </span>
            </div>
            <Slider
              value={discount}
              onValueChange={setDiscount}
              max={90}
              min={0}
              step={5}
              className="w-full"
            />
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Original Price:</span>
              <span className="font-semibold line-through">Rs. {Math.round(originalPrice)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Discount:</span>
              <span className="font-semibold text-red-500">- Rs. {Math.round(originalPrice - discountedPrice)}</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Final Price:</span>
                <span className="text-2xl font-bold text-green-600">
                  Rs. {Math.round(discountedPrice)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                'Apply Discount'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DiscountModal;