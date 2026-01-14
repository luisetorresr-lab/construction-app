'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [drawRequests, setDrawRequests] = useState<DrawRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawRequestsLoading, setDrawRequestsLoading] = useState(true);
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
    fetchProjects();
    fetchDrawRequests();
  }, []);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <button
            onClick={() => {
              setFormData({ name: '', total_budget: '', status: 'Not Started' });
              setIsModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            New Project
          </button>
        </div>
        
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No projects found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6 border border-gray-200"
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {project.name || 'Unnamed Project'}
                </h2>
                {project.description && (
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {project.description}
                  </p>
                )}
                <div className="space-y-2 mb-4">
                  {project.total_budget !== null && project.total_budget !== undefined && (
                    <p className="text-gray-700">
                      <span className="font-medium">Budget:</span> ${project.total_budget.toLocaleString()}
                    </p>
                  )}
                  {project.status && (
                    <p className="text-gray-700">
                      <span className="font-medium">Status:</span>{' '}
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        project.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        project.status === 'Active' ? 'bg-blue-100 text-blue-800' :
                        project.status === 'Delayed' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status}
                      </span>
                    </p>
                  )}
                </div>
                {project.created_at && (
                  <p className="text-sm text-gray-400">
                    {new Date(project.created_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Recent Draw Requests Section */}
        <div className="mt-16">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Recent Draw Requests</h2>
            <button
              onClick={() => {
                setDrawRequestFormData({ project_id: '', description: '', amount: '' });
                setIsDrawRequestModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              Submit Draw Request
            </button>
          </div>
          
          {drawRequestsLoading ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-4 text-gray-600">Loading draw requests...</p>
            </div>
          ) : drawRequests.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-500 text-lg">No active draw requests</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Project Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {drawRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {request.projects?.name || 'Unknown Project'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {request.description || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.amount !== null && request.amount !== undefined
                            ? `$${request.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {request.status ? (
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              request.status === 'Completed' || request.status === 'Approved' ? 'bg-green-100 text-green-800' :
                              request.status === 'Active' || request.status === 'Pending' ? 'bg-blue-100 text-blue-800' :
                              request.status === 'Delayed' || request.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {request.status}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {request.status === 'Pending' ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApprovePayment(request.id)}
                                className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-1 px-3 rounded transition-colors duration-200"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectPayment(request.id)}
                                className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium py-1 px-3 rounded transition-colors duration-200"
                              >
                                Reject
                              </button>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Create New Project</h2>
              <button
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold disabled:opacity-50"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter project name"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="total_budget" className="block text-sm font-medium text-gray-700 mb-1">
                  Total Budget
                </label>
                <input
                  type="number"
                  id="total_budget"
                  step="0.01"
                  min="0"
                  value={formData.total_budget}
                  onChange={(e) => setFormData({ ...formData, total_budget: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter budget amount"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Submit Draw Request</h2>
              <button
                onClick={handleCloseDrawRequestModal}
                disabled={isSubmittingDrawRequest}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold disabled:opacity-50"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmitDrawRequest} className="space-y-4">
              <div>
                <label htmlFor="draw_request_project" className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                <label htmlFor="draw_request_description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  id="draw_request_description"
                  value={drawRequestFormData.description}
                  onChange={(e) => {
                    setDrawRequestFormData(prev => ({ ...prev, description: e.target.value }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter description"
                  disabled={isSubmittingDrawRequest}
                />
              </div>

              <div>
                <label htmlFor="draw_request_amount" className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter amount"
                  disabled={isSubmittingDrawRequest}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseDrawRequestModal}
                  disabled={isSubmittingDrawRequest}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDrawRequest}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
