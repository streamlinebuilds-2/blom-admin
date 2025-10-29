import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { api } from "../components/data/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Search, Mail, Package, Truck, RotateCcw, Briefcase, HelpCircle } from "lucide-react";
import { useToast } from "../components/ui/ToastProvider";
import { Banner } from "../components/ui/Banner";

export default function Messages() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading, error } = useQuery({
    queryKey: ['messages'],
    queryFn: () => api.listMessages(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }) => api.updateMessage(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      showToast('success', 'Message updated');
    },
    onError: (error) => {
      showToast('error', error.message || 'Failed to update message');
    },
  });

  const filteredMessages = messages.filter(m => {
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    const matchesSearch = 
      m.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getInquiryIcon = (type) => {
    switch (type) {
      case 'order': return <Package className="w-4 h-4" />;
      case 'shipping': return <Truck className="w-4 h-4" />;
      case 'returns': return <RotateCcw className="w-4 h-4" />;
      case 'wholesale': return <Briefcase className="w-4 h-4" />;
      case 'general': return <Mail className="w-4 h-4" />;
      default: return <HelpCircle className="w-4 h-4" />;
    }
  };

  const getRelativeTime = (date) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  const handleStatusChange = (id, newStatus) => {
    updateMutation.mutate({ id, patch: { status: newStatus } });
  };

  const statusCounts = {
    all: messages.length,
    new: messages.filter(m => m.status === 'new').length,
    open: messages.filter(m => m.status === 'open').length,
    closed: messages.filter(m => m.status === 'closed').length
  };

  return (
    <>
      <style>{`
        .messages-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .messages-title {
          font-size: 28px;
          font-weight: 700;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .filter-chips {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .filter-chip {
          padding: 10px 20px;
          border-radius: 10px;
          border: none;
          background: var(--card);
          color: var(--text-muted);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 2px 2px 4px var(--shadow-dark), -2px -2px 4px var(--shadow-light);
          transition: all 0.2s;
          position: relative;
        }

        .filter-chip.active {
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          color: white;
          box-shadow: inset 2px 2px 4px rgba(0,0,0,0.3);
        }

        .chip-count {
          margin-left: 8px;
          padding: 2px 8px;
          border-radius: 6px;
          background: rgba(255,255,255,0.2);
          font-size: 12px;
        }

        .search-box {
          position: relative;
          width: 300px;
          max-width: 100%;
          margin-bottom: 24px;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px 12px 44px;
          border-radius: 12px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 14px;
          box-shadow: inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light);
        }

        .search-input:focus {
          outline: none;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }

        .messages-table {
          background: var(--card);
          border-radius: 20px;
          padding: 0;
          box-shadow: 8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light);
          overflow: hidden;
        }

        .table-container {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          text-align: left;
          padding: 20px 24px;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 2px solid var(--border);
          background: var(--card);
        }

        td {
          padding: 20px 24px;
          color: var(--text);
          border-bottom: 1px solid var(--border);
        }

        tr:last-child td {
          border-bottom: none;
        }

        tbody tr {
          transition: all 0.2s ease;
          cursor: pointer;
        }

        tbody tr:hover {
          background: rgba(110, 193, 255, 0.05);
        }

        .message-name {
          font-weight: 600;
          margin-bottom: 4px;
        }

        .message-email {
          font-size: 13px;
          color: var(--text-muted);
        }

        .message-subject {
          font-weight: 600;
        }

        .inquiry-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          background: var(--bg);
          color: var(--text);
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .status-dropdown {
          padding: 8px 12px;
          border-radius: 8px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 2px 2px 4px var(--shadow-dark), -2px -2px 4px var(--shadow-light);
        }

        .status-dropdown:focus {
          outline: none;
        }

        .status-new {
          color: #3b82f6;
        }

        .status-open {
          color: #f59e0b;
        }

        .status-closed {
          color: #10b981;
        }

        .relative-time {
          font-size: 13px;
          color: var(--text-muted);
        }

        .empty-state {
          padding: 80px 20px;
          text-align: center;
          color: var(--text-muted);
        }

        .empty-state-title {
          font-size: 20px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 8px;
        }
      `}</style>

      {error && <Banner type="error">{error.message || 'Failed to load messages'}</Banner>}

      <div className="messages-header">
        <h1 className="messages-title">
          <MessageSquare className="w-8 h-8" />
          Messages
        </h1>
      </div>

      <div className="filter-chips">
        <button
          className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          All
          <span className="chip-count">{statusCounts.all}</span>
        </button>
        <button
          className={`filter-chip ${statusFilter === 'new' ? 'active' : ''}`}
          onClick={() => setStatusFilter('new')}
        >
          New
          <span className="chip-count">{statusCounts.new}</span>
        </button>
        <button
          className={`filter-chip ${statusFilter === 'open' ? 'active' : ''}`}
          onClick={() => setStatusFilter('open')}
        >
          Open
          <span className="chip-count">{statusCounts.open}</span>
        </button>
        <button
          className={`filter-chip ${statusFilter === 'closed' ? 'active' : ''}`}
          onClick={() => setStatusFilter('closed')}
        >
          Closed
          <span className="chip-count">{statusCounts.closed}</span>
        </button>
      </div>

      <div className="search-box">
        <Search className="search-icon w-5 h-5" />
        <input
          type="text"
          className="search-input"
          placeholder="Search messages..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="messages-table">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Subject</th>
                <th>Type</th>
                <th>Status</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="empty-state">Loading messages...</td>
                </tr>
              ) : filteredMessages.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-state">
                    <div className="empty-state-title">No messages found</div>
                    <div>{searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'No messages yet'}</div>
                  </td>
                </tr>
              ) : (
                filteredMessages.map(message => (
                  <tr 
                    key={message.id}
                    onClick={(e) => {
                      if (e.target.tagName !== 'SELECT') {
                        window.location.href = createPageUrl(`MessageDetail?id=${message.id}`);
                      }
                    }}
                  >
                    <td>
                      <div className="message-name">{message.full_name}</div>
                      <div className="message-email">{message.email}</div>
                    </td>
                    <td>
                      <div className="message-subject">{message.subject}</div>
                    </td>
                    <td>
                      <div className="inquiry-badge">
                        {getInquiryIcon(message.inquiry_type)}
                        <span>{message.inquiry_type}</span>
                      </div>
                    </td>
                    <td>
                      <select
                        className={`status-dropdown status-${message.status}`}
                        value={message.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleStatusChange(message.id, e.target.value);
                        }}
                        disabled={updateMutation.isPending}
                      >
                        <option value="new">New</option>
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                      </select>
                    </td>
                    <td>
                      <div className="relative-time">{getRelativeTime(message.created_at)}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}