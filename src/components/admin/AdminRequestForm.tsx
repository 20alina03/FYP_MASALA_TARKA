import { useState, useEffect, useRef } from 'react';
import { mongoClient } from '@/lib/mongodb-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Loader2, MapPin, CheckCircle2, XCircle } from 'lucide-react';

interface AdminRequestFormProps {
  onSuccess: () => void;
}

type AddressStatus = 'idle' | 'waiting' | 'checking' | 'valid' | 'invalid';

const AdminRequestForm = ({ onSuccess }: AdminRequestFormProps) => {
  const [formData, setFormData] = useState({
    restaurant_name: '',
    government_registration_number: '',
    cnic: '',
    contact_number: '+92',
    address: '',
    city: '',
    latitude: '',   // hidden from UI — auto-fetched, sent to DB
    longitude: '',  // hidden from UI — auto-fetched, sent to DB
    description: '',
    cuisine_types: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [addressStatus, setAddressStatus] = useState<AddressStatus>('idle');
  const [resolvedPlace, setResolvedPlace] = useState('');
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Trigger geocoding only when BOTH address AND city are filled ─────────
  useEffect(() => {
    const address = formData.address.trim();
    const city = formData.city.trim();

    if (!address && !city) { setAddressStatus('idle'); return; }
    if (!address || !city) { setAddressStatus('waiting'); setFormData(prev => ({ ...prev, latitude: '', longitude: '' })); setResolvedPlace(''); return; }

    setAddressStatus('checking');
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    geocodeTimerRef.current = setTimeout(() => fetchCoordinates(address, city), 900);

    return () => { if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current); };
  }, [formData.address, formData.city]);

  const fetchCoordinates = async (address: string, city: string) => {
    try {
      const query = [address, city, 'Pakistan'].filter(Boolean).join(', ');
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=pk`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();

      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        setFormData(prev => ({ ...prev, latitude: parseFloat(lat).toFixed(6), longitude: parseFloat(lon).toFixed(6) }));
        setResolvedPlace(display_name);
        setAddressStatus('valid');
        setErrors(prev => ({ ...prev, address: '', city: '' }));
      } else {
        setFormData(prev => ({ ...prev, latitude: '', longitude: '' }));
        setResolvedPlace('');
        setAddressStatus('invalid');
      }
    } catch {
      setAddressStatus('invalid');
    }
  };

  // ─── Validators ──────────────────────────────────────────────────────────
  const validatePhone = (v: string) => {
    if (!v) return 'Contact number is required';
    if (!/^\+92[0-9]{10}$/.test(v)) return 'Enter a valid Pakistani number: +92XXXXXXXXXX (10 digits after +92)';
    return '';
  };

  const validateCNIC = (v: string) => {
    if (!v) return 'CNIC is required';
    if (!/^[0-9]{5}-[0-9]{7}-[0-9]{1}$/.test(v)) return 'Enter a valid CNIC: XXXXX-XXXXXXX-X';
    return '';
  };

  const handlePhoneChange = (value: string) => {
    if (!value.startsWith('+92')) value = '+92';
    const trimmed = '+92' + value.slice(3).replace(/\D/g, '').slice(0, 10);
    setFormData(prev => ({ ...prev, contact_number: trimmed }));
    setErrors(prev => ({ ...prev, contact_number: validatePhone(trimmed) }));
  };

  const handleCNICChange = (value: string) => {
    const d = value.replace(/\D/g, '').slice(0, 13);
    let f = d;
    if (d.length > 5) f = d.slice(0, 5) + '-' + d.slice(5);
    if (d.length > 12) f = d.slice(0, 5) + '-' + d.slice(5, 12) + '-' + d.slice(12);
    setFormData(prev => ({ ...prev, cnic: f }));
    setErrors(prev => ({ ...prev, cnic: validateCNIC(f) }));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!formData.restaurant_name.trim()) e.restaurant_name = 'Restaurant name is required';
    if (!formData.government_registration_number.trim()) e.government_registration_number = 'Registration number is required';
    if (!formData.address.trim()) e.address = 'Address is required';
    if (!formData.city.trim()) e.city = 'City is required';
    if (!formData.cuisine_types.trim()) e.cuisine_types = 'At least one cuisine type is required';
    const pe = validatePhone(formData.contact_number); if (pe) e.contact_number = pe;
    const ce = validateCNIC(formData.cnic); if (ce) e.cnic = ce;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const isAddressValid = addressStatus === 'valid';
  const canSubmit = !submitting && addressStatus !== 'checking' && isAddressValid;

  // ─── Map backend error messages to field-level errors ────────────────────
  const handleBackendError = (message: string) => {
    const msg = message.toLowerCase();

    if (msg.includes('government_registration_number') || msg.includes('registration number')) {
      setErrors(prev => ({ ...prev, government_registration_number: 'This government registration number is already registered.' }));
      toast({ title: "Duplicate Registration Number", description: "A restaurant with this government registration number already exists.", variant: "destructive" });
      return;
    }

    if (msg.includes('cnic')) {
      setErrors(prev => ({ ...prev, cnic: 'This CNIC is already associated with another restaurant.' }));
      toast({ title: "Duplicate CNIC", description: "This CNIC is already registered with another restaurant.", variant: "destructive" });
      return;
    }

    if (msg.includes('contact') || msg.includes('phone') || msg.includes('contact_number')) {
      setErrors(prev => ({ ...prev, contact_number: 'This contact number is already in use.' }));
      toast({ title: "Duplicate Contact Number", description: "This contact number is already registered.", variant: "destructive" });
      return;
    }

    if (msg.includes('restaurant_name') || msg.includes('restaurant name')) {
      setErrors(prev => ({ ...prev, restaurant_name: 'A restaurant with this name already exists.' }));
      toast({ title: "Duplicate Restaurant Name", description: "A restaurant with this name already exists.", variant: "destructive" });
      return;
    }

    if (msg.includes('already have a pending request') || msg.includes('pending')) {
      toast({ title: "Request Already Submitted", description: "You already have a pending admin request under review.", variant: "destructive" });
      return;
    }

    // Fallback — show raw backend message
    toast({ title: "Submission Failed", description: message || "Something went wrong. Please try again.", variant: "destructive" });
  };

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAddressValid) {
      toast({ title: "Address not verified", description: "Please enter a valid address and city before submitting.", variant: "destructive" });
      return;
    }
    if (!validate()) {
      toast({ title: "Missing or invalid fields", description: "Please fix the errors before submitting", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : 0,
        longitude: formData.longitude ? parseFloat(formData.longitude) : 0,
        cuisine_types: formData.cuisine_types.split(',').map(c => c.trim()).filter(c => c)
      };
      await mongoClient.request('/restaurants/admin/request', { method: 'POST', body: JSON.stringify(payload) });
      toast({ title: "Request submitted!", description: "Your admin request has been submitted for review" });
      onSuccess();
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || "Failed to submit request";
      handleBackendError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Address status banner ────────────────────────────────────────────────
  const AddressFeedback = () => {
    if (addressStatus === 'idle') return null;

    if (addressStatus === 'waiting') return (
      <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800 px-3 py-2 text-sm text-yellow-700 dark:text-yellow-300">
        <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
        <span>Please fill in both <strong>Address</strong> and <strong>City</strong> to verify your location.</span>
      </div>
    );

    if (addressStatus === 'checking') return (
      <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 px-3 py-2 text-sm text-blue-700 dark:text-blue-300">
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        <span>Verifying address…</span>
      </div>
    );

    if (addressStatus === 'valid') return (
      <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 px-3 py-2 text-sm text-green-700 dark:text-green-300">
        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">Address verified!</p>
          <p className="text-xs mt-0.5 opacity-75 line-clamp-2">{resolvedPlace}</p>
        </div>
      </div>
    );

    if (addressStatus === 'invalid') return (
      <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300">
        <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">Address not found in Pakistan</p>
          <p className="text-xs mt-0.5">Please correct your address or city. Submission is blocked until the address is verified.</p>
        </div>
      </div>
    );

    return null;
  };

  const addressBorderClass = (field: 'address' | 'city') => {
    if (addressStatus === 'invalid') return 'border-red-400 focus-visible:ring-red-400';
    if (addressStatus === 'valid') return 'border-green-400 focus-visible:ring-green-400';
    return '';
  };

  // ─── UI ───────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-4 px-4 py-6 md:px-6">

      {/* Restaurant Name */}
      <div className="space-y-2">
        <Label htmlFor="restaurant_name">Restaurant Name</Label>
        <Input id="restaurant_name" value={formData.restaurant_name}
          onChange={(e) => { setFormData(prev => ({ ...prev, restaurant_name: e.target.value })); if (errors.restaurant_name) setErrors(prev => ({ ...prev, restaurant_name: '' })); }}
          placeholder="Enter restaurant name" />
        {errors.restaurant_name && <p className="text-sm text-red-500">{errors.restaurant_name}</p>}
      </div>

      {/* Government Registration Number */}
      <div className="space-y-2">
        <Label htmlFor="government_registration_number">Government Registration Number</Label>
        <Input id="government_registration_number" value={formData.government_registration_number}
          onChange={(e) => { setFormData(prev => ({ ...prev, government_registration_number: e.target.value })); if (errors.government_registration_number) setErrors(prev => ({ ...prev, government_registration_number: '' })); }}
          placeholder="Enter government registration number" />
        {errors.government_registration_number && <p className="text-sm text-red-500">{errors.government_registration_number}</p>}
      </div>

      {/* CNIC */}
      <div className="space-y-2">
        <Label htmlFor="cnic">CNIC</Label>
        <Input id="cnic" value={formData.cnic} onChange={(e) => handleCNICChange(e.target.value)} placeholder="XXXXX-XXXXXXX-X" maxLength={15} />
        {errors.cnic && <p className="text-sm text-red-500">{errors.cnic}</p>}
      </div>

      {/* Contact Number */}
      <div className="space-y-2">
        <Label htmlFor="contact_number">Contact Number</Label>
        <Input id="contact_number" value={formData.contact_number} onChange={(e) => handlePhoneChange(e.target.value)} placeholder="+92XXXXXXXXXX" maxLength={13} />
        {errors.contact_number && <p className="text-sm text-red-500">{errors.contact_number}</p>}
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" value={formData.address}
          onChange={(e) => { setFormData(prev => ({ ...prev, address: e.target.value })); if (errors.address) setErrors(prev => ({ ...prev, address: '' })); }}
          placeholder="Enter full address"
          className={addressBorderClass('address')} />
        {errors.address && <p className="text-sm text-red-500">{errors.address}</p>}
      </div>

      {/* City & Cuisine Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" value={formData.city}
            onChange={(e) => { setFormData(prev => ({ ...prev, city: e.target.value })); if (errors.city) setErrors(prev => ({ ...prev, city: '' })); }}
            placeholder="Enter city"
            className={addressBorderClass('city')} />
          {errors.city && <p className="text-sm text-red-500">{errors.city}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cuisine_types">Cuisine Types (comma-separated)</Label>
          <Input id="cuisine_types" value={formData.cuisine_types}
            onChange={(e) => { setFormData(prev => ({ ...prev, cuisine_types: e.target.value })); if (errors.cuisine_types) setErrors(prev => ({ ...prev, cuisine_types: '' })); }}
            placeholder="e.g., Pakistani, Chinese" />
          {errors.cuisine_types && <p className="text-sm text-red-500">{errors.cuisine_types}</p>}
        </div>
      </div>

      {/* Address verification feedback — placed right after address fields */}
      <AddressFeedback />

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Tell us about your restaurant" rows={4} />
      </div>

      <Button type="submit" disabled={!canSubmit} className="w-full"
        title={!isAddressValid ? 'Verify your address before submitting' : ''}>
        {submitting ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
        ) : addressStatus === 'checking' ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying address...</>
        ) : !isAddressValid ? (
          'Verify Address to Submit'
        ) : (
          'Submit Request'
        )}
      </Button>
    </form>
  );
};

export default AdminRequestForm;