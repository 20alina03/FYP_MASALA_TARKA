import { useState, useEffect } from 'react';
import { mongoClient } from '@/lib/mongodb-client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { AlertTriangle, CheckCircle, Star, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ReportsManagementProps {
  onUpdate: () => void;
}

const ReportsManagement = ({ onUpdate }: ReportsManagementProps) => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingReport, setResolvingReport] = useState<any>(null);
  const [dismissingReport, setDismissingReport] = useState<any>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [dismissalReason, setDismissalReason] = useState('');
  const [blockUser, setBlockUser] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await mongoClient.request('/restaurants/superadmin/reports');
      setReports(Array.isArray(data) ? data : []);
    } catch (error:  any) {
      console.error('Fetch reports error:', error);
      toast({
        title:  "Error",
        description: "Failed to load reports",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    setSubmitting(true);

    try {
      await mongoClient.request(`/restaurants/superadmin/reports/${resolvingReport._id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete_review',
          resolution_note: resolutionNote,
          block_user: blockUser
        })
      });

      toast({
        title: "Success",
        description: blockUser ? "Review deleted and user blocked" : "Review deleted successfully"
      });

      setResolvingReport(null);
      setResolutionNote('');
      setBlockUser(false);
      fetchReports();
      onUpdate();
    } catch (error: any) {
      console.error('Resolve report error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to resolve report",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = async () => {
    if (!dismissalReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a dismissal reason",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      await mongoClient.request(`/restaurants/superadmin/reports/${dismissingReport._id}/dismiss`, {
        method: 'POST',
        body: JSON.stringify({
          dismissal_reason: dismissalReason
        })
      });

      toast({
        title: "Success",
        description: "Report dismissed and notification sent to restaurant admin"
      });

      setDismissingReport(null);
      setDismissalReason('');
      fetchReports();
      onUpdate();
    } catch (error: any) {
      console.error('Dismiss report error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to dismiss report",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse bg-muted h-32 rounded-lg"></div>
        ))}
      </div>
    );
  }

  const pendingReports = reports. filter(r => r.status === 'pending');
  const resolvedReports = reports.filter(r => r.status === 'resolved');
  const dismissedReports = reports.filter(r => r.status === 'dismissed');

  return (
    <div className="space-y-6">
      {/* Pending Reports */}
      {pendingReports.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Pending Reports ({pendingReports.length})
          </h3>
          <div className="space-y-4">
            {pendingReports.map((report) => (
              <Card key={report._id} className="border-red-200 bg-red-50/50">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="bg-red-100 text-red-700">
                          {report.report_type === 'restaurant_review' ? 'Restaurant Review' : 'Menu Item Review'}
                        </Badge>
                        <Badge variant="outline">
                          {report.restaurant_id?.name || 'Unknown Restaurant'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Reported by:  {report.reporter_id?.email || 'Unknown'}
                      </p>
                      <div className="bg-white p-3 rounded border mb-3">
                        <p className="text-sm font-semibold mb-1">Reason: </p>
                        <p className="text-sm">{report. reason}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Reported on: {new Date(report.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setDismissingReport(report)}
                        variant="outline"
                        className="border-yellow-200 hover:bg-yellow-50"
                      >
                        Dismiss
                      </Button>
                      <Button
                        onClick={() => setResolvingReport(report)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Resolve Report
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Resolved Reports */}
      {resolvedReports.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Resolved ({resolvedReports.length})
          </h3>
          <div className="space-y-4">
            {resolvedReports.map((report) => (
              <Card key={report._id} className="border-green-200 opacity-60">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-green-100 text-green-700">Resolved</Badge>
                        <Badge variant="outline">
                          {report.restaurant_id?.name || 'Unknown Restaurant'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Resolved on: {new Date(report. resolved_at).toLocaleString()}
                      </p>
                      {report.resolution_note && (
                        <p className="text-sm mt-2">Note: {report.resolution_note}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Dismissed Reports */}
      {dismissedReports.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            Dismissed ({dismissedReports.length})
          </h3>
          <div className="space-y-4">
            {dismissedReports.map((report) => (
              <Card key={report._id} className="border-yellow-200 opacity-70">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">Dismissed</Badge>
                        <Badge variant="outline">
                          {report.restaurant_id?.name || 'Unknown Restaurant'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Reported by: {report.reporter_id?.email || 'Unknown'}
                      </p>
                      {report.dismissal_reason && (
                        <div className="bg-yellow-50 p-2 rounded border border-yellow-200 mt-2">
                          <p className="text-xs font-semibold text-yellow-800 mb-1">Dismissal Reason:</p>
                          <p className="text-sm text-yellow-700">{report.dismissal_reason}</p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Dismissed on: {new Date(report.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {reports.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No reports found</p>
        </Card>
      )}

      {/* Resolve Modal */}
      <Dialog open={!!resolvingReport} onOpenChange={() => setResolvingReport(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resolve Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-semibold mb-2">Report Details:</p>
              <p className="text-sm mb-2">
                <strong>Restaurant:</strong> {resolvingReport?. restaurant_id?.name}
              </p>
              <p className="text-sm mb-2">
                <strong>Type:</strong> {resolvingReport?.report_type === 'restaurant_review' ? 'Restaurant Review' : 'Menu Item Review'}
              </p>
              <p className="text-sm mb-2">
                <strong>Reason:</strong> {resolvingReport?.reason}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Resolution Note</Label>
              <Textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Add a note about your decision..."
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="block-user">Block User</Label>
                <p className="text-sm text-muted-foreground">
                  Permanently block the user who posted this review
                </p>
              </div>
              <Switch
                id="block-user"
                checked={blockUser}
                onCheckedChange={setBlockUser}
              />
            </div>

            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <p className="text-sm text-red-800 font-semibold mb-2">
                ⚠️ Warning: This action cannot be undone
              </p>
              <p className="text-sm text-red-700">
                The review will be permanently deleted. 
                {blockUser && ' The user will be blocked from posting future reviews.'}
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setResolvingReport(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleResolve}
                disabled={submitting}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {submitting ? 'Processing...' : 'Delete Review & Resolve'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dismiss Modal */}
      <Dialog open={!!dismissingReport} onOpenChange={() => setDismissingReport(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dismiss Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-semibold mb-2">Report Details:</p>
              <p className="text-sm mb-2">
                <strong>Restaurant:</strong> {dismissingReport?. restaurant_id?.name}
              </p>
              <p className="text-sm mb-2">
                <strong>Type:</strong> {dismissingReport?.report_type === 'restaurant_review' ? 'Restaurant Review' : 'Menu Item Review'}
              </p>
              <p className="text-sm mb-2">
                <strong>Reason:</strong> {dismissingReport?.reason}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dismissal-reason">Dismissal Reason</Label>
              <Textarea
                id="dismissal-reason"
                value={dismissalReason}
                onChange={(e) => setDismissalReason(e.target.value)}
                placeholder="Explain why this report is being dismissed (this will be sent to the restaurant admin)..."
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <p className="text-sm text-yellow-800 font-semibold mb-2">
                ℹ️ Note: Report will not be resolved
              </p>
              <p className="text-sm text-yellow-700">
                The review will NOT be deleted. The report will be marked as dismissed, and the restaurant admin will be notified of the reason.
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setDismissingReport(null)}
                className="flex-1"
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDismiss}
                disabled={submitting || !dismissalReason.trim()}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700"
              >
                {submitting ? 'Dismissing...' : 'Dismiss Report'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReportsManagement;