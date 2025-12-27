import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit, Trash2, Eye, X, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import axiosClient from '../api/axiosClient'; // Pastikan path ini benar!

// --- PERBAIKAN 1: Interface harus sinkron dengan BE ---
interface TobongData {
  tobong_id: number; // Menggunakan ID dari BE
  nama_tobong: string; // Menggunakan nama_tobong (snake_case)
  tanggal_pembuatan: string; // Dari BE
  lokasi: string;
  kapasitas: number;
  kapasitas_abu: number;
  // Menyesuaikan status: 'aktif' (tersedia), 'perbaikan' (maintenance), 'non-aktif' (penuh)
  status_operasional: 'aktif' | 'perbaikan' | 'non-aktif'; 
  created_at: string;
  updated_at: string;
}

interface ManajemenTobongProps {
  showToast: (message: string, type: 'success' | 'error' | 'warning') => void;
}

const getStatusBadge = (status: string) => {
  const styles = {
    aktif: 'bg-green-100 text-green-700',
    'non-aktif': 'bg-orange-100 text-orange-700', // Penuh -> non-aktif
    perbaikan: 'bg-red-100 text-red-700', // Maintenance -> perbaikan
  };
  return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700';
};

// --- Helper untuk konversi FE (tersedia/penuh/maintenance) ke BE (aktif/non-aktif/perbaikan) ---
const mapStatusToBE = (feStatus: string) => {
    switch (feStatus) {
        case 'tersedia': return 'aktif';
        case 'penuh': return 'non-aktif';
        case 'maintenance': return 'perbaikan';
        default: return 'aktif';
    }
};

export function ManajemenTobong({ showToast }: ManajemenTobongProps) {
  const [tobongList, setTobongList] = useState<TobongData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'detail'>('add');
  const [selectedTobong, setSelectedTobong] = useState<TobongData | null>(null);
  const [formData, setFormData] = useState({
    nama_tobong: '', // PERBAIKAN: snake_case
    lokasi: '',
    kapasitas: '',
    kapasitas_abu: '',
    tanggal_pembuatan: new Date().toISOString().split('T')[0], // Tambahkan tanggal pembuatan
    status_operasional: 'aktif' as 'aktif' | 'perbaikan' | 'non-aktif', // PERBAIKAN: enum BE
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);


  // --- FUNGSI ASINKRON: FETCH DATA ---
  const fetchTobong = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axiosClient.get('/tobong'); // Endpoint sesuai Route::apiResource('tobong')
      setTobongList(response.data);
    } catch (error) {
      showToast('Gagal memuat data tobong.', 'error');
      console.error("Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchTobong();
  }, [fetchTobong]);


  const filteredTobong = tobongList.filter(tobong =>
    tobong.nama_tobong.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tobong.lokasi.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    setModalMode('add');
    setFormData({
      nama_tobong: '',
      lokasi: '',
      kapasitas: '',
      kapasitas_abu: '',
      tanggal_pembuatan: new Date().toISOString().split('T')[0],
      status_operasional: 'aktif',
    });
    setSelectedTobong(null);
    setIsModalOpen(true);
  };

  const handleEdit = (tobong: TobongData) => {
    setModalMode('edit');
    setSelectedTobong(tobong);
    setFormData({
      nama_tobong: tobong.nama_tobong,
      lokasi: tobong.lokasi,
      kapasitas: tobong.kapasitas.toString(),
      kapasitas_abu: tobong.kapasitas_abu.toString(),
      tanggal_pembuatan: tobong.tanggal_pembuatan,
      status_operasional: tobong.status_operasional,
    });
    setIsModalOpen(true);
  };

  const handleDetail = (tobong: TobongData) => {
    setModalMode('detail');
    setSelectedTobong(tobong);
    setIsModalOpen(true);
  };

  // --- FUNGSI ASINKRON: DELETE DATA ---
  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus tobong ini?')) {
      return;
    }
    
    try {
      await axiosClient.delete(`/tobong/${id}`);
      showToast('Tobong berhasil dihapus', 'success');
      fetchTobong(); // Refresh data
    } catch (error) {
      showToast('Gagal menghapus data.', 'error');
      console.error("Delete Error:", error);
    }
  };

  // --- FUNGSI ASINKRON: SUBMIT (ADD / EDIT) ---
  const handleSubmit = async () => {
    if (!formData.nama_tobong || !formData.lokasi || !formData.kapasitas) {
      showToast('Mohon lengkapi Nama Tobong, Lokasi, dan Kapasitas.', 'warning');
      return;
    }

    setIsSubmitting(true);
    const dataToSend = {
      ...formData,
      kapasitas: Number(formData.kapasitas),
      kapasitas_abu: Number(formData.kapasitas_abu),
    };

    try {
      if (modalMode === 'add') {
        // POST request
        await axiosClient.post('/tobong', dataToSend);
        showToast('Tobong berhasil ditambahkan', 'success');
      } else if (modalMode === 'edit' && selectedTobong) {
        // PUT request
        await axiosClient.put(`/tobong/${selectedTobong.tobong_id}`, dataToSend);
        showToast('Data tobong berhasil diperbarui', 'success');
      }
      
      setIsModalOpen(false);
      fetchTobong(); // Refresh data

    } catch (error: any) {
      const msg = error.response?.data?.message || 'Terjadi kesalahan saat menyimpan data.';
      showToast(msg, 'error');
      console.error("Submit Error:", error);
      
    } finally {
      setIsSubmitting(false);
    }
  };

  // ... (getStatusBadge function remains the same, adjusted for BE enum names) ...

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* ... Header & Filters & Actions remain the same ... */}
      <div className="mb-6">
        <h1 className="text-gray-900 mb-2">Manajemen Tobong</h1>
        <p className="text-gray-600">Kelola data tobong pembakaran sampah</p>
      </div>

      {/* Filters & Actions */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Cari nama tobong atau lokasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4C9876]"
            />
          </div>

          {/* Add Button */}
          <button
            onClick={handleAdd}
            className="bg-[#4C9876] text-white px-4 py-2.5 rounded-xl hover:bg-[#3d7a5e] transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-5 h-5" strokeWidth={1.5} />
            <span>Tambah Tobong</span>
          </button>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="text-gray-600 text-sm mb-1">Total Tobong</div>
          <div className="text-gray-900">{tobongList.length}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="text-gray-600 text-sm mb-1">Tersedia (Aktif)</div>
          <div className="text-green-600">{tobongList.filter(t => t.status_operasional === 'aktif').length}</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="text-gray-600 text-sm mb-1">Maintenance (Perbaikan)</div>
          <div className="text-red-600">{tobongList.filter(t => t.status_operasional === 'perbaikan').length}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
            <div className="text-center py-12 text-gray-500 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Memuat data...
            </div>
        ) : (
            <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                    <th className="px-6 py-4 text-left text-gray-700">Nama Tobong</th>
                    <th className="px-6 py-4 text-left text-gray-700">Tanggal Pembuatan</th>
                    <th className="px-6 py-4 text-left text-gray-700">Lokasi</th>
                    <th className="px-6 py-4 text-left text-gray-700">Kapasitas</th>
                    <th className="px-6 py-4 text-left text-gray-700">Kapasitas Abu</th>
                    <th className="px-6 py-4 text-left text-gray-700">Status</th>
                    <th className="px-6 py-4 text-left text-gray-700">Aksi</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                {filteredTobong.map((tobong) => (
                    <tr key={tobong.tobong_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-900">{tobong.nama_tobong}</td>
                    <td className="px-6 py-4 text-gray-600">{new Date(tobong.tanggal_pembuatan).toLocaleDateString('id-ID')}</td>
                    <td className="px-6 py-4 text-gray-600">{tobong.lokasi}</td>
                    <td className="px-6 py-4 text-gray-600">{tobong.kapasitas} Kg</td>
                    <td className="px-6 py-4 text-gray-600">{tobong.kapasitas_abu} Kg</td>
                    <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm ${getStatusBadge(tobong.status_operasional)}`}>
                        {tobong.status_operasional}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleDetail(tobong)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Detail"
                        >
                            <Eye className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                        <button
                            onClick={() => handleEdit(tobong)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Edit"
                        >
                            <Edit className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                        <button
                            onClick={() => handleDelete(tobong.tobong_id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus"
                        >
                            <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                        </div>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        )}
        
        {!isLoading && filteredTobong.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Tidak ada data tobong ditemukan
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <Modal onClose={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-gray-900">
                {modalMode === 'add' && 'Tambah Tobong Baru'}
                {modalMode === 'edit' && 'Edit Data Tobong'}
                {modalMode === 'detail' && 'Detail Tobong'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg" disabled={isSubmitting}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {modalMode === 'detail' && selectedTobong ? (
                <div className="space-y-4">
                  {/* ... (Detail content uses selectedTobong.nama_tobong, selectedTobong.status_operasional, dll.) ... */}
                  <div>
                    <label className="block text-gray-600 text-sm mb-1">Nama Tobong</label>
                    <p className="text-gray-900">{selectedTobong.nama_tobong}</p>
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-1">Tanggal Pembuatan</label>
                    <p className="text-gray-900">{new Date(selectedTobong.tanggal_pembuatan).toLocaleDateString('id-ID')}</p>
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-1">Lokasi</label>
                    <p className="text-gray-900">{selectedTobong.lokasi}</p>
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-1">Kapasitas Sampah</label>
                    <p className="text-gray-900">{selectedTobong.kapasitas} Kg</p>
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-1">Kapasitas Abu</label>
                    <p className="text-gray-900">{selectedTobong.kapasitas_abu} Kg</p>
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-1">Status Operasional</label>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm ${getStatusBadge(selectedTobong.status_operasional)}`}>
                      {selectedTobong.status_operasional}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Form fields use formData.nama_tobong, formData.status_operasional, etc. */}
                  <div>
                    <label className="block text-gray-700 mb-2">Nama Tobong</label>
                    <input
                      type="text"
                      value={formData.nama_tobong}
                      onChange={(e) => setFormData({ ...formData, nama_tobong: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4C9876]"
                      placeholder="Contoh: Tobong F"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2">Lokasi</label>
                    <input
                      type="text"
                      value={formData.lokasi}
                      onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4C9876]"
                      placeholder="Contoh: Area Utara"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2">Kapasitas Sampah (Kg)</label>
                    <input
                      type="number"
                      value={formData.kapasitas}
                      onChange={(e) => setFormData({ ...formData, kapasitas: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4C9876]"
                      placeholder="Masukkan kapasitas"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2">Kapasitas Abu (Kg)</label>
                    <input
                      type="number"
                      value={formData.kapasitasAbu}
                      onChange={(e) => setFormData({ ...formData, kapasitasAbu: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4C9876]"
                      placeholder="Masukkan kapasitas abu"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2">Status Operasional</label>
                    <select
                      value={formData.status_operasional}
                      onChange={(e) => setFormData({ ...formData, status_operasional: e.target.value as any })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4C9876]"
                    >
                      <option value="aktif">Aktif (Tersedia)</option>
                      <option value="non-aktif">Non-Aktif (Penuh)</option>
                      <option value="perbaikan">Perbaikan (Maintenance)</option>
                    </select>
                  </div>
                  <input type="hidden" value={formData.tanggal_pembuatan} /> {/* Tanggal Pembuatan diset saat add/edit */}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {modalMode !== 'detail' && (
              <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  disabled={isSubmitting}
                >
                  Batal
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2.5 bg-[#4C9876] text-white rounded-xl hover:bg-[#3d7a5e] transition-colors flex items-center gap-2"
                  disabled={isSubmitting}
                >
                    {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} />}
                    {modalMode === 'add' ? 'Tambah' : 'Simpan'}
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}