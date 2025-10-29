import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings as SettingsIcon, User, Save } from "lucide-react";
import { useToast } from "../components/ui/ToastProvider";
import { Banner } from "../components/ui/Banner";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("users");
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading: loadingUsers, error: usersError } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        return await base44.entities.User.list();
      } catch (e) {
        console.error('Failed to load users:', e);
        return [];
      }
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }) => base44.entities.User.update(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast('success', 'User updated successfully');
    },
    onError: (error) => {
      showToast('error', error.message || 'Failed to update user');
    },
  });

  const hasUsersEntity = !usersError || !usersError.message?.includes('does not exist');

  return (
    <>
      <style>{`
        .settings-header {
          margin-bottom: 32px;
        }

        .header-title {
          font-size: 28px;
          font-weight: 700;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          background: var(--card);
          padding: 6px;
          border-radius: 12px;
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .tab {
          padding: 10px 20px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab.active {
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          color: white;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
        }

        .settings-card {
          background: var(--card);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
        }

        .users-table {
          background: var(--card);
          border-radius: 16px;
          padding: 0;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
          overflow: hidden;
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
          border-bottom: 2px solid var(--border);
        }

        td {
          padding: 20px 24px;
          color: var(--text);
          border-bottom: 1px solid var(--border);
        }

        tr:last-child td {
          border-bottom: none;
        }

        .user-name-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
        }

        .user-info {
          flex: 1;
        }

        .user-name {
          font-weight: 600;
        }

        .user-email {
          font-size: 13px;
          color: var(--text-muted);
        }

        .role-select {
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

        .role-badge {
          display: inline-flex;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .role-owner {
          background: #8b5cf620;
          color: #8b5cf6;
        }

        .role-staff {
          background: #3b82f620;
          color: #3b82f6;
        }

        .role-user {
          background: #6b728020;
          color: #6b7280;
        }

        .empty-state {
          text-align: center;
          padding: 80px 20px;
          color: var(--text-muted);
        }

        .info-box {
          background: var(--bg);
          border-left: 4px solid var(--accent);
          padding: 16px;
          border-radius: 10px;
          margin-bottom: 24px;
        }

        .info-title {
          font-weight: 600;
          color: var(--text);
          margin-bottom: 8px;
        }

        .info-text {
          font-size: 14px;
          color: var(--text-muted);
          line-height: 1.6;
        }
      `}</style>

      <div className="settings-header">
        <h1 className="header-title">
          <SettingsIcon className="w-8 h-8" />
          Settings
        </h1>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button
          className={`tab ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          General
        </button>
      </div>

      {activeTab === 'users' && (
        <>
          {!hasUsersEntity ? (
            <Banner type="info">
              <strong>User management requires proper permissions.</strong>
              <p style={{ marginTop: '8px', fontSize: '13px' }}>
                Contact your administrator to set up user roles and permissions.
              </p>
            </Banner>
          ) : (
            <>
              <div className="info-box">
                <div className="info-title">User Roles</div>
                <div className="info-text">
                  <strong>Owner:</strong> Full access to all features and settings.<br />
                  <strong>Staff:</strong> Can manage products, orders, and inventory.<br />
                  <strong>User:</strong> Limited read-only access.
                </div>
              </div>

              <div className="users-table">
                <table>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingUsers ? (
                      <tr>
                        <td colSpan="3" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          Loading users...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan="3" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          No users found
                        </td>
                      </tr>
                    ) : (
                      users.map(user => (
                        <tr key={user.id}>
                          <td>
                            <div className="user-name-cell">
                              <div className="user-avatar">
                                {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                              </div>
                              <div className="user-info">
                                <div className="user-name">{user.full_name || 'Unnamed User'}</div>
                                <div className="user-email">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`role-badge role-${user.role || 'user'}`}>
                              {(user.role || 'user').toUpperCase()}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                            {new Date(user.created_date).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {activeTab === 'general' && (
        <div className="settings-card">
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>
            General Settings
          </h2>
          <div className="info-box">
            <div className="info-title">Store Information</div>
            <div className="info-text">
              Configure your store name, currency, timezone, and other general settings through the platform dashboard.
            </div>
          </div>
        </div>
      )}
    </>
  );
}