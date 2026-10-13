import React, { useEffect, useState } from 'react';
import {
  Settings,
  Building,
  Truck,
  Wallet,
  Plus,
  User,
  ShieldCheck,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import { api, formatINR, formatDate } from '../api';
import { Institution, Vendor, CompanyAdvance, User as UserType } from '../types';
import { Modal } from '../components/Modal';

export function SettingsPage({ user }: { user: UserType }) {
  const [activeTab, setActiveTab] = useState<'institutions' | 'vendors' | 'advances'>('institutions');
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [advances, setAdvances] = useState<CompanyAdvance[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddInstOpen, setIsAddInstOpen] = useState(false);
  const [isAddVenOpen, setIsAddVenOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [instRes, venRes, advRes] = await Promise.all([
        api<Institution[]>('/institutions'),
        api<Vendor[]>('/vendors'),
        api<CompanyAdvance[]>('/advances'),
      ]);
      setInstitutions(instRes);
      setVendors(venRes);
      setAdvances(advRes);
    } catch (err: any) {
      alert(`Error loading master data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="text-slate-800" /> Settings & Master Reference Data
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage institutions, equipment suppliers, tour advances, and local workplace configuration.
        </p>
      </div>

      {/* USER PROFILE INFO CARD */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-base">
            {user.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">{user.name}</h3>
            <p className="text-xs text-slate-500">
              Username: <span className="font-mono text-slate-700">{user.username}</span> · Role: <span className="capitalize font-semibold text-sky-700">{user.role}</span>
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-400 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
          Local SQLite Storage · Passwords hashed with bcrypt · Session bound to 127.0.0.1
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('institutions')}
          className={`pb-3 px-4 text-xs font-bold transition-colors flex items-center gap-1.5 border-b-2 ${
            activeTab === 'institutions'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building size={16} /> Institutions ({institutions.length})
        </button>
        <button
          onClick={() => setActiveTab('vendors')}
          className={`pb-3 px-4 text-xs font-bold transition-colors flex items-center gap-1.5 border-b-2 ${
            activeTab === 'vendors'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck size={16} /> Equipment Vendors ({vendors.length})
        </button>
        <button
          onClick={() => setActiveTab('advances')}
          className={`pb-3 px-4 text-xs font-bold transition-colors flex items-center gap-1.5 border-b-2 ${
            activeTab === 'advances'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wallet size={16} /> Advances Ledger ({advances.length})
        </button>
      </div>

      {/* INSTITUTIONS TAB */}
      {activeTab === 'institutions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 font-medium">
              Registered Government Schools, Colleges & Polytechnics
            </span>
            <button
              onClick={() => setIsAddInstOpen(true)}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
            >
              <Plus size={14} /> Add Institution
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {institutions.map((i) => (
              <div key={i.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <div className="font-bold text-slate-900 text-sm">{i.name}</div>
                <div className="text-[11px] text-sky-700 font-medium">{i.type || 'Educational Campus'}</div>
                {i.address && (
                  <p className="text-xs text-slate-500 flex items-start gap-1">
                    <MapPin size={13} className="shrink-0 mt-0.5 text-slate-400" /> {i.address}
                  </p>
                )}
                {i.contact_name && (
                  <div className="text-xs text-slate-700 font-medium pt-1 border-t border-slate-100 flex items-center gap-1">
                    <User size={13} className="text-slate-400" /> {i.contact_name}
                  </div>
                )}
                {i.phone && (
                  <div className="text-xs text-slate-500 font-mono flex items-center gap-1">
                    <Phone size={13} className="text-slate-400" /> {i.phone}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VENDORS TAB */}
      {activeTab === 'vendors' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 font-medium">
              Equipment Manufacturers & Component Vendors
            </span>
            <button
              onClick={() => setIsAddVenOpen(true)}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
            >
              <Plus size={14} /> Add Vendor
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map((v) => (
              <div key={v.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <div className="font-bold text-slate-900 text-sm">{v.name}</div>
                <div className="text-[11px] text-slate-500 font-medium">{v.category || 'Laboratory Hardware'}</div>
                {v.address && <p className="text-xs text-slate-500">{v.address}</p>}
                {v.contact_name && (
                  <div className="text-xs text-slate-700 font-medium pt-1 border-t border-slate-100">
                    Contact: {v.contact_name}
                  </div>
                )}
                {v.phone && (
                  <div className="text-xs text-slate-500 font-mono">
                    {v.phone}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADVANCES TAB */}
      {activeTab === 'advances' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Date Received</th>
                  <th className="py-3 px-4">Sanction Notes</th>
                  <th className="py-3 px-4">Sanctioned</th>
                  <th className="py-3 px-4">Used in Field</th>
                  <th className="py-3 px-4">Remaining Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {advances.map((a) => (
                  <tr key={a.id}>
                    <td className="py-3 px-4 font-mono">{formatDate(a.received_date)}</td>
                    <td className="py-3 px-4 max-w-sm text-slate-700">{a.settlement_notes || 'Field Tour Advance'}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {formatINR(a.amount_paise)}
                    </td>
                    <td className="py-3 px-4 font-mono text-purple-700">
                      {formatINR(a.amount_used_paise)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                      {formatINR(a.remaining_paise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD INSTITUTION MODAL */}
      {isAddInstOpen && (
        <Modal
          title="Add Government Institution"
          description="Register school, polytechnic, or college laboratory campus."
          onClose={() => setIsAddInstOpen(false)}
          maxWidth="md"
        >
          <InstitutionForm
            onSuccess={() => {
              setIsAddInstOpen(false);
              loadData();
            }}
            onCancel={() => setIsAddInstOpen(false)}
          />
        </Modal>
      )}

      {/* ADD VENDOR MODAL */}
      {isAddVenOpen && (
        <Modal
          title="Add Equipment Vendor"
          description="Register instrument manufacturer or electronics component supplier."
          onClose={() => setIsAddVenOpen(false)}
          maxWidth="md"
        >
          <VendorForm
            onSuccess={() => {
              setIsAddVenOpen(false);
              loadData();
            }}
            onCancel={() => setIsAddVenOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
}

function InstitutionForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data: Record<string, any> = {};

    formData.forEach((val, key) => {
      if (val !== '') data[key] = val;
    });

    try {
      await api('/institutions', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      onSuccess();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div>
        <label className="block font-semibold text-slate-700 mb-1">Institution Name *</label>
        <input
          name="name"
          required
          placeholder="e.g. Government Polytechnic College - Electronics Wing"
          className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-sky-500"
        />
      </div>

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Institution Type</label>
        <select name="type" defaultValue="Polytechnic Institute" className="w-full p-2 border border-slate-200 rounded-lg bg-white">
          <option value="Government School">Government School</option>
          <option value="Government College">Government College</option>
          <option value="Polytechnic Institute">Polytechnic Institute</option>
          <option value="Science Research Lab">Science Research Lab</option>
          <option value="University Campus">University Campus</option>
        </select>
      </div>

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Address / District</label>
        <textarea name="address" rows={2} placeholder="Campus location, street, city..." className="w-full p-2 border border-slate-200 rounded-lg" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Contact Person</label>
          <input name="contact_name" placeholder="Principal / HOD" className="w-full p-2 border border-slate-200 rounded-lg" />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Phone</label>
          <input name="phone" placeholder="+91..." className="w-full p-2 border border-slate-200 rounded-lg" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-1.5 font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs"
        >
          {loading ? 'Adding...' : 'Add Institution'}
        </button>
      </div>
    </form>
  );
}

function VendorForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data: Record<string, any> = {};

    formData.forEach((val, key) => {
      if (val !== '') data[key] = val;
    });

    try {
      await api('/vendors', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      onSuccess();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div>
        <label className="block font-semibold text-slate-700 mb-1">Vendor / Supplier Name *</label>
        <input
          name="name"
          required
          placeholder="e.g. Bharat Precision Electronics Ltd."
          className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-sky-500"
        />
      </div>

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Equipment Category</label>
        <input name="category" placeholder="Electronics & Instrumentation" className="w-full p-2 border border-slate-200 rounded-lg" />
      </div>

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Address</label>
        <textarea name="address" rows={2} placeholder="Factory / depot address..." className="w-full p-2 border border-slate-200 rounded-lg" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Contact Person</label>
          <input name="contact_name" placeholder="Technical Support Lead" className="w-full p-2 border border-slate-200 rounded-lg" />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Phone</label>
          <input name="phone" placeholder="+91..." className="w-full p-2 border border-slate-200 rounded-lg" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-1.5 font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs"
        >
          {loading ? 'Adding...' : 'Add Vendor'}
        </button>
      </div>
    </form>
  );
}
