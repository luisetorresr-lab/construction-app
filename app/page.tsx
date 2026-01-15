'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { supabase } from '@/lib/supabase';
import DrawRequestPDF from './components/DrawRequestPDF';
import BudgetChart from './components/BudgetChart';

interface Project {
  id: string;
  name?: string;
  description?: string;
  total_budget?: number;
  status?: string;
  created_at?: string;
  [key: string]: any;
}

interface DrawRequest {
  id: string;
  description?: string;
  amount?: number;
  status?: string;
  project_id?: string;
  projects?: {
    name?: string;
  };
  [key: string]: any;
}

export default function Home() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [drawRequests, setDrawRequests] = useState<DrawRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawRequestsLoading, setDrawRequestsLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrawRequestModalOpen, setIsDrawRequestModalOpen] = useState(false);
  const [isSubmittingDrawRequest, setIsSubmittingDrawRequest] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    total_budget: '',
    status: 'Not Started'
  });
  const [drawRequestFormData, setDrawRequestFormData] = useState({
    project_id: '',
    description: '',
    amount: ''
  });

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setProjects(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchDrawRequests = async () => {
    try {
      setDrawRequestsLoading(true);
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          projects (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setDrawRequests(data || []);
    } catch (err: any) {
      console.error('Failed to fetch draw requests:', err.message);
      setDrawRequests([]);
    } finally {
      setDrawRequestsLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }
        setCheckingAuth(false);
        fetchProjects();
        fetchDrawRequests();
      } catch (err) {
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (err: any) {
      console.error('Error signing out:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('projects')
        .insert([
          {
            name: formData.name,
            total_budget: formData.total_budget ? parseFloat(formData.total_budget) : null,
            status: formData.status
          }
        ]);

      if (error) {
        throw error;
      }

      // Reset form and close modal
      setFormData({ name: '', total_budget: '', status: 'Not Started' });
      setIsModalOpen(false);
      
      // Refresh projects list
      await fetchProjects();
      await fetchDrawRequests();
    } catch (err: any) {
      alert(err.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    if (!isSubmitting) {
      setIsModalOpen(false);
      setFormData({ name: '', total_budget: '', status: 'Not Started' });
    }
  };

  const handleSubmitDrawRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingDrawRequest(true);

    try {
      const { error } = await supabase
        .from('payments')
        .insert([
          {
            project_id: drawRequestFormData.project_id,
            description: drawRequestFormData.description || null,
            amount: drawRequestFormData.amount ? parseFloat(drawRequestFormData.amount) : null,
            status: 'Pending'
          }
        ]);

      if (error) {
        throw error;
      }

      // Reset form and close modal
      setDrawRequestFormData({ project_id: '', description: '', amount: '' });
      setIsDrawRequestModalOpen(false);
      
      // Refresh draw requests list
      await fetchDrawRequests();
    } catch (err: any) {
      alert(err.message || 'Failed to submit draw request');
    } finally {
      setIsSubmittingDrawRequest(false);
    }
  };

  const handleCloseDrawRequestModal = () => {
    if (!isSubmittingDrawRequest) {
      setIsDrawRequestModalOpen(false);
      setDrawRequestFormData({ project_id: '', description: '', amount: '' });
    }
  };

  const handleApprovePayment = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status: 'Approved' })
        .eq('id', paymentId);

      if (error) {
        throw error;
      }

      await fetchDrawRequests();
    } catch (err: any) {
      alert(err.message || 'Failed to approve payment');
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status: 'Rejected' })
        .eq('id', paymentId);

      if (error) {
        throw error;
      }

      await fetchDrawRequests();
    } catch (err: any) {
      alert(err.message || 'Failed to reject payment');
    }
  };

  // Calculate metrics
  const totalBudget = projects.reduce((sum, p) => sum + (p.total_budget || 0), 0);
  const activeProjects = projects.filter(p => p.status === 'Active').length;
  const pendingApprovals = drawRequests.filter(r => r.status === 'Pending').length;

  // Calculate chart data: total spent per project
  const chartData = projects.map((project) => {
    const totalSpent = drawRequests
      .filter((request) => request.project_id === project.id)
      .reduce((sum, request) => sum + (request.amount || 0), 0);

    return {
      name: project.name || 'Unnamed Project',
      budget: project.total_budget || 0,
      spent: totalSpent,
    };
  });

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-700"></div>
          <p className="mt-4 text-zinc-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-700"></div>
          <p className="mt-4 text-zinc-400">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex">
      {/* Fixed Sidebar */}
      <div className="fixed left-0 top-0 h-screen w-64 bg-[#18181b] border-r border-zinc-800 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-zinc-800">
          <h1 className="text-xl font-bold text-white">ConstructionOS</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <a href="#" className="block px-3 py-2 text-sm font-medium text-white bg-zinc-800 rounded-md">
            Dashboard
          </a>
          <a href="#" className="block px-3 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors">
            Projects
          </a>
          <a href="#" className="block px-3 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors">
            Settings
          </a>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={handleSignOut}
            className="w-full px-3 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors text-left"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                <p className="mt-2 text-sm text-zinc-400">Manage your construction projects and draw requests</p>
              </div>
              <button
                onClick={() => {
                  setFormData({ name: '', total_budget: '', status: 'Not Started' });
                  setIsModalOpen(true);
                }}
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                New Project
              </button>
            </div>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-[#18181b] border border-zinc-800 rounded-lg p-6">
              <p className="text-sm text-zinc-400 mb-2">Total Budget</p>
              <p className="text-2xl font-bold text-white">${totalBudget.toLocaleString()}</p>
            </div>
            <div className="bg-[#18181b] border border-zinc-800 rounded-lg p-6">
              <p className="text-sm text-zinc-400 mb-2">Active Projects</p>
              <p className="text-2xl font-bold text-white">{activeProjects}</p>
            </div>
            <div className="bg-[#18181b] border border-zinc-800 rounded-lg p-6">
              <p className="text-sm text-zinc-400 mb-2">Pending Approval</p>
              <p className="text-2xl font-bold text-white">{pendingApprovals}</p>
            </div>
          </div>

          {/* Budget vs Actual Spend Chart */}
          <div className="bg-[#18181b] border border-zinc-800 rounded-lg overflow-hidden mb-8">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-white">Budget vs. Actual Spend</h2>
            </div>
            <div className="p-6">
              <BudgetChart projects={chartData} />
            </div>
          </div>

          {/* Draw Requests Table */}
          <div className="bg-[#18181b] border border-zinc-800 rounded-lg overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Draw Requests</h2>
              <button
                onClick={() => {
                  setDrawRequestFormData({ project_id: '', description: '', amount: '' });
                  setIsDrawRequestModalOpen(true);
                }}
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
              >
                Submit Draw Request
              </button>
            </div>
            
            {drawRequestsLoading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-700"></div>
                <p className="mt-4 text-zinc-400">Loading draw requests...</p>
              </div>
            ) : drawRequests.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-zinc-400 text-lg">No active draw requests</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-zinc-800">
                  <thead className="bg-[#18181b]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                        Project Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-[#18181b] divide-y divide-zinc-800">
                    {drawRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-zinc-900/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {request.projects?.name || 'Unknown Project'}
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-400">
                          {request.description || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {request.amount !== null && request.amount !== undefined
                            ? `$${request.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {request.status ? (
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              request.status === 'Completed' || request.status === 'Approved' 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                              request.status === 'Active' || request.status === 'Pending' 
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                              request.status === 'Delayed' || request.status === 'Rejected' 
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                              'bg-zinc-800 text-zinc-400 border border-zinc-700'
                            }`}>
                              {request.status}
                            </span>
                          ) : (
                            <span className="text-zinc-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-2 items-center">
                            {request.status === 'Pending' ? (
                              <>
                                <button
                                  onClick={() => handleApprovePayment(request.id)}
                                  className="bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs font-medium py-1 px-3 rounded border border-green-500/30 transition-colors duration-200"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRejectPayment(request.id)}
                                  className="bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium py-1 px-3 rounded border border-red-500/30 transition-colors duration-200"
                                >
                                  Reject
                                </button>
                              </>
                            ) : null}
                            {isMounted && (
                              <PDFDownloadLink
                                document={
                                  <DrawRequestPDF
                                    project={{
                                      name: request.projects?.name || 'Unknown Project',
                                      address: '',
                                    }}
                                    payment={{
                                      id: request.id,
                                      amount: request.amount || 0,
                                      description: request.description || '',
                                      date: request.created_at || new Date().toISOString(),
                                    }}
                                  />
                                }
                                fileName={`draw-request-${request.id}.pdf`}
                                className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 text-xs font-medium py-1 px-3 rounded border border-indigo-500/30 transition-colors duration-200"
                              >
                                {({ loading }) => (loading ? 'Generating...' : 'Download PDF')}
                              </PDFDownloadLink>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#18181b] border border-zinc-800 rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Create New Project</h2>
              <button
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="text-zinc-400 hover:text-white text-2xl font-bold disabled:opacity-50 transition-colors"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-zinc-400 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#09090b] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                  placeholder="Enter project name"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="total_budget" className="block text-sm font-medium text-zinc-400 mb-1">
                  Total Budget
                </label>
                <input
                  type="number"
                  id="total_budget"
                  step="0.01"
                  min="0"
                  value={formData.total_budget}
                  onChange={(e) => setFormData({ ...formData, total_budget: e.target.value })}
                  className="w-full px-3 py-2 bg-[#09090b] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                  placeholder="Enter budget amount"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-zinc-400 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    setFormData(prev => ({ ...prev, status: newStatus }));
                  }}
                  className="w-full px-3 py-2 bg-[#09090b] border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                  disabled={isSubmitting}
                >
                  <option value="Not Started">Not Started</option>
                  <option value="Active">Active</option>
                  <option value="Delayed">Delayed</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 border border-zinc-800 rounded-lg text-zinc-400 hover:bg-zinc-900 hover:text-white font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Draw Request Modal */}
      {isDrawRequestModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#18181b] border border-zinc-800 rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Submit Draw Request</h2>
              <button
                onClick={handleCloseDrawRequestModal}
                disabled={isSubmittingDrawRequest}
                className="text-zinc-400 hover:text-white text-2xl font-bold disabled:opacity-50 transition-colors"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmitDrawRequest} className="space-y-4">
              <div>
                <label htmlFor="draw_request_project" className="block text-sm font-medium text-zinc-400 mb-1">
                  Project *
                </label>
                <select
                  id="draw_request_project"
                  name="project_id"
                  required
                  value={drawRequestFormData.project_id}
                  onChange={(e) => {
                    const newProjectId = e.target.value;
                    setDrawRequestFormData(prev => ({ ...prev, project_id: newProjectId }));
                  }}
                  className="w-full px-3 py-2 bg-[#09090b] border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                  disabled={isSubmittingDrawRequest}
                >
                  <option value="">Select a project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name || 'Unnamed Project'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="draw_request_description" className="block text-sm font-medium text-zinc-400 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  id="draw_request_description"
                  value={drawRequestFormData.description}
                  onChange={(e) => {
                    setDrawRequestFormData(prev => ({ ...prev, description: e.target.value }));
                  }}
                  className="w-full px-3 py-2 bg-[#09090b] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                  placeholder="Enter description"
                  disabled={isSubmittingDrawRequest}
                />
              </div>

              <div>
                <label htmlFor="draw_request_amount" className="block text-sm font-medium text-zinc-400 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  id="draw_request_amount"
                  step="0.01"
                  min="0"
                  value={drawRequestFormData.amount}
                  onChange={(e) => {
                    setDrawRequestFormData(prev => ({ ...prev, amount: e.target.value }));
                  }}
                  className="w-full px-3 py-2 bg-[#09090b] border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                  placeholder="Enter amount"
                  disabled={isSubmittingDrawRequest}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseDrawRequestModal}
                  disabled={isSubmittingDrawRequest}
                  className="flex-1 px-4 py-2 border border-zinc-800 rounded-lg text-zinc-400 hover:bg-zinc-900 hover:text-white font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDrawRequest}
                  className="flex-1 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingDrawRequest ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
