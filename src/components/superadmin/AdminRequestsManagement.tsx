import { useState, useEffect } from 'react';
import { mongoClient } from '@/lib/mongodb-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, MapPin, Phone, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AdminRequestsManagementProps {
  onUpdate: () => void;
}

const AdminRequestsManagement = ({ onUpdate }: AdminRequestsManagementProps) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingRequest, setRejectingRequest] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await mongoClient.request('/restaurants/superadmin/requests');
      setRequests(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Fetch requests error:', error);
      toast({
        title: "Error",
        description: "Failed to load admin requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    if (! confirm('Are you sure you want to approve this admin request?')) return;

    try {
      await mongoClient.request(`/restaurants/superadmin/approve/${requestId}`, {
        method: 'POST'
      });

      toast({
        title: "Success",
        description: "Admin request approved successfully"
      });

      fetchRequests();
      onUpdate();
    } catch (error: any) {
      console.error('Approve request error:', error);
      toast({
        title: "Error",
        description: error. message || "Failed to approve request",
        variant: "destructive"
      });
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      await mongoClient.request(`/restaurants/superadmin/reject/${rejectingRequest._id}`, {
        method: 'POST',
        body: JSON.stringify({
          rejection_reason: rejectionReason
        })
      });

      toast({
        title: "Success",
        description: "Admin request rejected and notification sent to admin"
      });

      setRejectingRequest(null);
      setRejectionReason('');
      fetchRequests();
      onUpdate();
    } catch (error: any) {
      console.error('Reject request error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject request",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenRejectDialog = (request: any) => {
    setRejectingRequest(request);
    setRejectionReason('');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse bg-muted h-48 rounded-lg"></div>
        ))}
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const rejectedRequests = requests.filter(r => r. status === 'rejected');

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            Pending Requests ({pendingRequests.length})
          </h3>
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <Card key={request._id} className="border-yellow-200 bg-yellow-50/50">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl mb-2">{request.restaurant_name}</CardTitle>
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
                        Pending Review
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground mt-1" />
                      <div>
                        <p className="text-sm text-muted-foreground">Requested by</p>
                        <p className="font-semibold">{request.user_id?. email || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground mt-1" />
                      <div>
                        <p className="text-sm text-muted-foreground">Contact</p>
                        <p className="font-semibold">{request.contact_number}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground mt-1" />
                      <div>
                        <p className="text-sm text-muted-foreground">government Registration Number</p>
                        <p className="font-semibold">{request.government_registration_number}</p>
                      </div>
                    </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-semibold">{request.address}, {request.city}</p>
                    </div>
                  </div>

                  {request.description && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Description</p>
                      <p className="text-sm">{request.description}</p>
                    </div>
                  )}

                  {request.cuisine_types && request.cuisine_types.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Cuisine Types</p>
                      <div className="flex flex-wrap gap-2">
                        {request.cuisine_types. map((cuisine:  string, idx: number) => (
                          <Badge key={idx} variant="secondary">{cuisine}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => handleOpenRejectDialog(request)}
                      className="flex-1 border-red-200 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleApprove(request._id)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Approved Requests */}
      {approvedRequests.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Approved ({approvedRequests.length})
          </h3>
          <div className="space-y-4">
            {approvedRequests.map((request) => (
              <Card key={request._id} className="border-green-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-lg">{request.restaurant_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {request.user_id?.email} • {request.city}
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-700 border-green-300">
                      Approved
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Rejected Requests */}
      {rejectedRequests.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            Rejected ({rejectedRequests.length})
          </h3>
          <div className="space-y-4">
            {rejectedRequests.map((request) => (
              <Card key={request._id} className="border-red-200 opacity-60">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-lg">{request.restaurant_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {request.user_id?.email} • {request.city}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                      Rejected
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {requests.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No admin requests found</p>
        </Card>
      )}

      {/* Reject Dialog */}
      <Dialog open={!!rejectingRequest} onOpenChange={() => setRejectingRequest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reject Admin Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-semibold mb-2">Request Details:</p>
              <p className="text-sm mb-2">
                <strong>Restaurant:</strong> {rejectingRequest?.restaurant_name}
              </p>
              <p className="text-sm mb-2">
                <strong>Requested by:</strong> {rejectingRequest?.user_id?.email}
              </p>
              <p className="text-sm">
                <strong>City:</strong> {rejectingRequest?.city}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this request is being rejected (this will be sent to the admin)..."
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <p className="text-sm text-red-800 font-semibold mb-2">
                ⚠️ Important
              </p>
              <p className="text-sm text-red-700">
                The admin will receive a notification with your rejection reason.
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setRejectingRequest(null)}
                className="flex-1"
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={submitting || !rejectionReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {submitting ? 'Rejecting...' : 'Reject Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRequestsManagement;