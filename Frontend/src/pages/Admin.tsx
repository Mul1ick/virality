// FILE: Frontend/src/pages/Admin.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Clock, Loader2, ArrowLeft, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  isAdmin: boolean;
}

const Admin = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/admin/users');
      setUsers(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch users');
      toast.error("Failed to load users", { description: err.response?.data?.detail });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateStatus = async (userId: string, action: 'approve' | 'reject') => {
    try {
      await apiClient.post(`/admin/users/${userId}/${action}`);
      toast.success(`User ${action}d successfully.`);
      // Refresh user list
      setUsers(users.map(u => 
        u._id === userId ? { ...u, status: action === 'approve' ? 'approved' : 'rejected' } : u
      ));
    } catch (err: any) {
      toast.error(`Failed to ${action} user.`);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'approved') {
      return (
        <Badge variant="outline" className="text-success border-success/30 bg-success/10">
          <Check className="h-3 w-3 mr-1" />
          Approved
        </Badge>
      );
    }
    if (status === 'rejected') {
      return (
        <Badge variant="destructive">
          <X className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-yellow-600 border-yellow-500/30 bg-yellow-500/10">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    );
  };

  const pendingUsers = users.filter(u => !u.isAdmin && u.status === 'pending');
  const otherUsers = users.filter(u => !u.isAdmin && u.status !== 'pending');

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="container mx-auto">
        <Button variant="outline" size="sm" onClick={() => navigate('/profile')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Profile
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
              <UserCheck className="h-6 w-6 text-primary" />
              Admin Portal - User Management
            </CardTitle>
            <CardDescription>
              Approve or reject new user sign-ups.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-destructive text-center">{error}</div>
            ) : (
              <div className="space-y-6">
                {pendingUsers.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Pending Requests</h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingUsers.map((user) => (
                            <TableRow key={user._id}>
                              <TableCell>{user.name}</TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>{getStatusBadge(user.status)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-1 sm:gap-2 justify-end flex-nowrap">
                                  <Button size="sm" onClick={() => handleUpdateStatus(user._id, 'approve')} className="bg-success hover:bg-success/90">Approve</Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus(user._id, 'reject')}>Reject</Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {otherUsers.length > 0 && (
                   <div>
                    <h3 className="text-lg font-semibold mb-3">All Other Users</h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {otherUsers.map((user) => (
                            <TableRow key={user._id}>
                              <TableCell>{user.name}</TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>{getStatusBadge(user.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;