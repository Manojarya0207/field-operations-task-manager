import React, { useEffect, useState } from 'react';
import {
  Package,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  ClipboardCheck,
  ShieldAlert,
  Building,
  Calendar,
  Layers,
  ArrowRight,
  RotateCcw,
  Tag,
} from 'lucide-react';
import { api, formatDate, formatDateTime } from '../api';
import {
  InventoryAsset,
  QAStatus,
  StockStatus,
  Institution,
  Vendor,
  InstallationJob,
} from '../types';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';

export function InventoryPage() {
  const [assets, setAssets] = useState<InventoryAsset[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [qaStatusFilter, setQaStatusFilter] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<InventoryAsset | null>(null);
  const [isQAModalOpen, setIsQAModalOpen] = useState(false);
  const [isDispositionModalOpen, setIsDispositionModalOpen] = useState(false);
  const [dispositionNotes, setDispositionNotes] = useState('');
  const [dispositionBy, setDispositionBy] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('q', search);
      if (qaStatusFilter) queryParams.set('qa_status', qaStatusFilter);
      if (stockStatusFilter) queryParams.set('stock_status', stockStatusFilter);

      const [assetsRes, instRes, venRes] = await Promise.all([
        api<InventoryAsset[]>(`/inventory?${queryParams.toString()}`),
        api<Institution[]>('/institutions'),
        api<Vendor[]>('/vendors'),
      ]);

      setAssets(assetsRes);
      setInstitutions(instRes);
      setVendors(venRes);
    } catch (err: any) {
      alert(`Error loading inventory: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, qaStatusFilter, stockStatusFilter]);

  const openAssetDetails = async (asset: InventoryAsset) => {
    try {
      const detailed = await api<InventoryAsset>(`/inventory/${asset.id}`);
      setSelectedAsset(detailed);
    } catch {
      setSelectedAsset(asset);
    }
  };

  const handleStockStatusChange = async (asset: InventoryAsset, newStockStatus: StockStatus) => {
    const isQuarantinedOrFailed = asset.qa_status === 'Failed' || asset.stock_status === 'Quarantine';
    const isDispatchReady = ['Available', 'Reserved', 'Dispatched', 'Installed'].includes(newStockStatus);

    if (isQuarantinedOrFailed && isDispatchReady && !asset.disposition_notes) {
      // Require documented authorized disposition!
      setSelectedAsset(asset);
      setIsDispositionModalOpen(true);
      return;
    }

    try {
      await api(`/inventory/${asset.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ stock_status: newStockStatus }),
      });
      loadData();
      if (selectedAsset?.id === asset.id) {
        openAssetDetails(asset);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDispositionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;

    if (!dispositionNotes.trim() || !dispositionBy.trim()) {
      alert('Documented disposition notes and authorized officer name are required.');
      return;
    }

    try {
      await api(`/inventory/${selectedAsset.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          stock_status: 'Available',
          disposition_notes: dispositionNotes.trim(),
          disposition_by: dispositionBy.trim(),
          disposition_date: new Date().toISOString(),
        }),
      });
      setIsDispositionModalOpen(false);
      setDispositionNotes('');
      setDispositionBy('');
      loadData();
      openAssetDetails(selectedAsset);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="text-sky-600" /> Equipment Inventory & QA
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track electronics, optical lab instruments, QA test verification, and quarantine dispositions.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus size={15} /> Add Equipment Asset
        </button>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search Asset ID, product, serial number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-sky-500"
            />
          </div>

          <select
            value={qaStatusFilter}
            onChange={(e) => setQaStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-sky-500 bg-white"
          >
            <option value="">All QA Statuses</option>
            <option value="Pending">Pending QA</option>
            <option value="In Progress">In Progress</option>
            <option value="Passed">Passed</option>
            <option value="Failed">Failed (Quarantine)</option>
            <option value="Not Applicable">Not Applicable</option>
          </select>

          <select
            value={stockStatusFilter}
            onChange={(e) => setStockStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-sky-500 bg-white"
          >
            <option value="">All Stock Statuses</option>
            <option value="Received">Received</option>
            <option value="QA Pending">QA Pending</option>
            <option value="Available">Available for Dispatch</option>
            <option value="Reserved">Reserved</option>
            <option value="Dispatched">Dispatched to Institution</option>
            <option value="Installed">Installed & Verified</option>
            <option value="Quarantine">Quarantine</option>
            <option value="Returned to Vendor">Returned to Vendor</option>
          </select>
        </div>
      </div>

      {/* ASSETS TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading inventory from SQLite...</div>
        ) : assets.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Package size={36} className="mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No equipment assets found</p>
            <p className="text-xs text-slate-400">Add instruments or check filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Asset ID & Product</th>
                  <th className="py-3 px-4">Serial / Manufacturer</th>
                  <th className="py-3 px-4">Storage Location</th>
                  <th className="py-3 px-4">QA Status</th>
                  <th className="py-3 px-4">Stock Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assets.map((asset) => (
                  <tr
                    key={asset.id}
                    onClick={() => openAssetDetails(asset)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-sky-700">{asset.asset_id}</div>
                      <div className="font-semibold text-slate-900 mt-0.5">{asset.product_name}</div>
                      {asset.institution_name && (
                        <div className="text-[11px] text-emerald-700 font-medium truncate">
                          Assigned: {asset.institution_name}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-mono text-slate-800">{asset.serial_number || 'No Serial Tag'}</div>
                      <div className="text-[11px] text-slate-400">
                        {asset.manufacturer || 'General'} {asset.model && `· ${asset.model}`}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-slate-800 font-medium">{asset.storage_location || 'Main Depot'}</div>
                      <div className="text-[11px] text-slate-400">Qty: {asset.quantity}</div>
                    </td>

                    <td className="py-3 px-4">
                      <Badge value={asset.qa_status} />
                    </td>

                    <td className="py-3 px-4">
                      <Badge value={asset.stock_status} />
                      {asset.stock_status === 'Quarantine' && !asset.disposition_notes && (
                        <span className="text-[10px] text-rose-600 block font-semibold mt-0.5">
                          Dispatch Blocked
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {asset.qa_status === 'Pending' && (
                          <button
                            onClick={() => {
                              setSelectedAsset(asset);
                              setIsQAModalOpen(true);
                            }}
                            className="px-2 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded text-[11px] font-semibold flex items-center gap-1"
                          >
                            <ClipboardCheck size={13} /> Run QA
                          </button>
                        )}
                        <button
                          onClick={() => openAssetDetails(asset)}
                          className="px-2 py-1 text-slate-500 hover:bg-slate-100 rounded text-[11px] font-semibold"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ASSET DETAIL MODAL */}
      {selectedAsset && (
        <Modal
          title={selectedAsset.product_name}
          description={`Asset Tag: ${selectedAsset.asset_id} · Serial: ${selectedAsset.serial_number || 'N/A'}`}
          onClose={() => setSelectedAsset(null)}
          maxWidth="2xl"
        >
          <div className="space-y-5 text-xs text-slate-700">
            {/* Status & QA Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-500">QA:</span>
                <Badge value={selectedAsset.qa_status} size="md" />
                <span className="font-semibold text-slate-500 ml-2">Stock:</span>
                <Badge value={selectedAsset.stock_status} size="md" />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsQAModalOpen(true)}
                  className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-semibold flex items-center gap-1"
                >
                  <ClipboardCheck size={13} /> QA Record
                </button>
                {selectedAsset.stock_status === 'Quarantine' && (
                  <button
                    onClick={() => setIsDispositionModalOpen(true)}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold"
                  >
                    Authorize Disposition
                  </button>
                )}
              </div>
            </div>

            {/* Quarantine alert if applicable */}
            {(selectedAsset.qa_status === 'Failed' || selectedAsset.stock_status === 'Quarantine') && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 space-y-1">
                <h4 className="font-bold flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-rose-600" /> Equipment in Quarantine
                </h4>
                <p className="text-[11px] leading-relaxed">
                  Compliance safeguard: This asset failed QA inspection or was quarantined. It cannot be marked Available, Dispatched, or Installed without documented authorized disposition notes.
                </p>
                {selectedAsset.disposition_notes && (
                  <div className="pt-2 border-t border-rose-200 text-[11px]">
                    <span className="font-bold">Authorized Disposition: </span>
                    {selectedAsset.disposition_notes} (by {selectedAsset.disposition_by} on {formatDate(selectedAsset.disposition_date)})
                  </div>
                )}
              </div>
            )}

            {/* Specifications & Location Grid */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block font-medium">Manufacturer & Model:</span>
                <span className="font-semibold text-slate-800">
                  {selectedAsset.manufacturer || '—'} {selectedAsset.model && `(${selectedAsset.model})`}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Storage Location:</span>
                <span className="font-semibold text-slate-800">
                  {selectedAsset.storage_location || 'Depot'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Vendor Supplier:</span>
                <span className="font-semibold text-slate-800">
                  {selectedAsset.vendor_name || 'Direct Procurement'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">PO Reference:</span>
                <span className="font-semibold text-slate-800">
                  {selectedAsset.po_reference || '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Received Date:</span>
                <span className="font-semibold text-slate-800">
                  {formatDate(selectedAsset.received_date)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Warranty End Date:</span>
                <span className="font-semibold text-slate-800">
                  {formatDate(selectedAsset.warranty_end_date)}
                </span>
              </div>
            </div>

            {/* QA Test History */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                <ClipboardCheck size={14} className="text-sky-600" />
                QA Inspection Records ({selectedAsset.qaHistory?.length || 0})
              </h4>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedAsset.qaHistory?.length ? (
                  selectedAsset.qaHistory.map((q) => (
                    <div key={q.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-slate-800">Tester: {q.tester_name}</span>
                        <Badge value={q.status} />
                      </div>
                      <p className="text-slate-700 leading-relaxed">{q.observations}</p>
                      {q.approval_details && (
                        <div className="text-[10px] text-slate-400">
                          Signoff: {q.approval_details}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic">No QA tests logged yet.</p>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* RUN QA CHECK MODAL */}
      {isQAModalOpen && selectedAsset && (
        <Modal
          title={`Run QA Test: ${selectedAsset.asset_id}`}
          description={selectedAsset.product_name}
          onClose={() => setIsQAModalOpen(false)}
          maxWidth="md"
        >
          <QAForm
            asset={selectedAsset}
            onSuccess={() => {
              setIsQAModalOpen(false);
              loadData();
              openAssetDetails(selectedAsset);
            }}
            onCancel={() => setIsQAModalOpen(false)}
          />
        </Modal>
      )}

      {/* AUTHORIZED DISPOSITION MODAL */}
      {isDispositionModalOpen && selectedAsset && (
        <Modal
          title="Document Authorized Quarantine Disposition"
          description={`Release failed/quarantined equipment ${selectedAsset.asset_id} with documented disposition.`}
          onClose={() => setIsDispositionModalOpen(false)}
          maxWidth="md"
        >
          <form onSubmit={handleDispositionSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
              <p className="font-semibold flex items-center gap-1 mb-1">
                <ShieldAlert size={14} /> Disposition Authority Requirement
              </p>
              <p className="text-[11px] leading-relaxed">
                Before this asset can be returned to active inventory or dispatched to an educational institution, record the technical disposition decision and the authorizing engineer's name.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Authorized By (Officer / Lead Engineer) *
              </label>
              <input
                required
                placeholder="Full Name"
                value={dispositionBy}
                onChange={(e) => setDispositionBy(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Disposition Decision & Technical Justification *
              </label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Recalibrated transformer shunt on test bench; verified 0 drift and passed isolation test."
                value={dispositionNotes}
                onChange={(e) => setDispositionNotes(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDispositionModalOpen(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs"
              >
                Save Disposition & Release
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* CREATE ASSET MODAL */}
      {isAddModalOpen && (
        <Modal
          title="Add New Inventory Asset"
          description="Catalog electronics or laboratory equipment received at the local depot."
          onClose={() => setIsAddModalOpen(false)}
          maxWidth="xl"
        >
          <AssetForm
            institutions={institutions}
            vendors={vendors}
            onSuccess={() => {
              setIsAddModalOpen(false);
              loadData();
            }}
            onCancel={() => setIsAddModalOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
}

function QAForm({
  asset,
  onSuccess,
  onCancel,
}: {
  asset: InventoryAsset;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [status, setStatus] = useState<'Passed' | 'Failed'>('Passed');
  const [testerName, setTesterName] = useState('Ramesh Kumar');
  const [observations, setObservations] = useState('');
  const [approvalDetails, setApprovalDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api(`/inventory/${asset.id}/qa`, {
        method: 'POST',
        body: JSON.stringify({
          status,
          tester_name: testerName,
          test_date: new Date().toISOString().slice(0, 10),
          observations,
          approval_details: approvalDetails || undefined,
        }),
      });
      onSuccess();
    } catch (err: any) {
      alert(`QA Error: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div>
        <label className="block font-semibold text-slate-700 mb-1">QA Inspection Result *</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="qa_status"
              checked={status === 'Passed'}
              onChange={() => setStatus('Passed')}
            />
            <span className="font-semibold text-emerald-700">Passed (Ready for Dispatch)</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="qa_status"
              checked={status === 'Failed'}
              onChange={() => setStatus('Failed')}
            />
            <span className="font-semibold text-rose-700">Failed (Send to Quarantine)</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Tester Name *</label>
        <input
          required
          value={testerName}
          onChange={(e) => setTesterName(e.target.value)}
          className="w-full p-2 border border-slate-200 rounded-lg"
        />
      </div>

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Test Observations & Readings *</label>
        <textarea
          required
          rows={3}
          placeholder="Mains isolation resistance, frequency sweep, voltage stability test results..."
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-sky-500"
        />
      </div>

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Sign-off / Calibration Certificate Reference</label>
        <input
          placeholder="e.g. Calibrated per ISO/IEC 17025 standard calibration rig #4"
          value={approvalDetails}
          onChange={(e) => setApprovalDetails(e.target.value)}
          className="w-full p-2 border border-slate-200 rounded-lg"
        />
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
          {loading ? 'Recording...' : 'Record QA Check'}
        </button>
      </div>
    </form>
  );
}

function AssetForm({
  institutions,
  vendors,
  onSuccess,
  onCancel,
}: {
  institutions: Institution[];
  vendors: Vendor[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data: Record<string, any> = {};

    formData.forEach((value, key) => {
      if (value !== '') {
        data[key] = key === 'quantity' ? parseInt(value as string, 10) : value;
      }
    });

    try {
      await api('/inventory', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      onSuccess();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Asset ID / Barcode *</label>
          <input
            name="asset_id"
            required
            placeholder="e.g. EQ-DSO-2024-002"
            className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
          <input
            name="product_name"
            required
            placeholder="e.g. Digital Storage Oscilloscope 100MHz"
            className="w-full p-2 border border-slate-200 rounded-lg"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Category</label>
          <input name="category" placeholder="Test & Measurement" className="w-full p-2 border border-slate-200 rounded-lg" />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Manufacturer</label>
          <input name="manufacturer" placeholder="Bharat Precision" className="w-full p-2 border border-slate-200 rounded-lg" />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Model</label>
          <input name="model" placeholder="Model Number" className="w-full p-2 border border-slate-200 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Serial Number</label>
          <input name="serial_number" placeholder="SN-..." className="w-full p-2 border border-slate-200 rounded-lg font-mono" />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
          <input type="number" name="quantity" defaultValue={1} min={1} className="w-full p-2 border border-slate-200 rounded-lg" />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Storage Location</label>
          <input name="storage_location" placeholder="Rack B-3" className="w-full p-2 border border-slate-200 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Supplier Vendor</label>
          <select name="vendor_id" className="w-full p-2 border border-slate-200 rounded-lg bg-white">
            <option value="">Select Vendor</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Assigned Institution (optional)</label>
          <select name="institution_id" className="w-full p-2 border border-slate-200 rounded-lg bg-white">
            <option value="">Unassigned / Depot Stock</option>
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg shadow-xs"
        >
          {loading ? 'Adding...' : 'Add Equipment Asset'}
        </button>
      </div>
    </form>
  );
}
