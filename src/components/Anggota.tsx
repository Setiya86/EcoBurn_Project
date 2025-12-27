import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit, Trash2, Eye, X, Filter, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import axiosClient from '../api/axiosClient'; // Pastikan path ini benar!

// --- INTERFACE SESUAI OUTPUT ACCESSOR BE ---
interface AnggotaData {
  id: number; // Dari accessor getIdAttribute()
  nama: string; // Dari accessor getNamaAttribute()
  telepon: string; // Dari accessor getTeleponAttribute()
  email: string;
  alamat: string;
  totalSampah: number; // Dari accessor getTotalSampahAttribute()
  status: 'aktif' | 'masa tenggang' | 'nonaktif'; // Dari accessor getStatusAttribute()
  pembayaran: 'lunas' | 'pending'; // Dari accessor getPembayaranAttribute()
}

interface AnggotaProps {
  showToast: (message: string, type: 'success' | 'error' | 'warning') => void;
}

export function Anggota({ showToast }: AnggotaProps) {
  const [anggotaList, setAnggotaList] = useState<AnggotaData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('semua');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'detail'>('add');
  const [selectedAnggota, setSelectedAnggota] = useState<AnggotaData | null>(null);
  
  const [isLoading, setIsLoading] = useState(true); 
  const [isSubmitting, setIsSubmitting] = useState(false); 

  // PERBAIKAN: FormData menggunakan nama Accessor FE dan menambahkan jumlah_bayar
  const [formData, setFormData] = useState({
    nama: '',
    telepon: '',
    email: '',
    alamat: '',
    status: 'aktif' as 'aktif' | 'masa tenggang' | 'nonaktif',
    jumlah_bayar: '', // Wajib untuk mode 'add'
  });


  // --- CRUD: READ (FETCH DATA) ---
  const fetchAnggota = useCallback(async () => {
    setIsLoading(true);
    try {
        const response = await axiosClient.get('/daftaranggota'); // GET /api/daftaranggota
        setAnggotaList(response.data);
    } catch (error) {
        showToast('Gagal memuat data anggota.', 'error');
        console.error("Fetch Error:", error);
    } finally {
        setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAnggota();
  }, [fetchAnggota]);


  const filteredAnggota = anggotaList.filter(anggota => {
    const matchesSearch = anggota.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          anggota.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          anggota.telepon.includes(searchQuery);
    
    const matchesFilter = filterStatus === 'semua' || anggota.status === filterStatus; 
    return matchesSearch && matchesFilter;
  });

  const handleAdd = () => {
    setModalMode('add');
    // Inisialisasi default/kosong
    setFormData({ nama: '', telepon: '', email: '', alamat: '', status: 'aktif', jumlah_bayar: '' });
    setSelectedAnggota(null);
    setIsModalOpen(true);
  };

  const handleEdit = (anggota: AnggotaData) => {
    setModalMode('edit');
    setSelectedAnggota(anggota);
    // Mapping data yang diterima dari BE ke state form
    setFormData({
      nama: anggota.nama,
      telepon: anggota.telepon,
      email: anggota.email,
      alamat: anggota.alamat,
      status: anggota.status,
      jumlah_bayar: '', // Kosongkan saat edit
    });
    setIsModalOpen(true);
  };

  const handleDetail = (anggota: AnggotaData) => {
    setModalMode('detail');
    setSelectedAnggota(anggota);
    setIsModalOpen(true);
  };

  // --- CRUD: DELETE DATA ---
  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus anggota ini? Tindakan ini tidak bisa dibatalkan.')) {
      return;
    }
    
    try {
      await axiosClient.delete(`/daftaranggota/${id}`);
      showToast('Anggota berhasil dihapus', 'success');
      fetchAnggota(); // Refresh data
    } catch (error) {
      showToast('Gagal menghapus data.', 'error');
    }
  };


  // --- CRUD: SUBMIT (CREATE / UPDATE) ---
  const handleSubmit = async () => {
    if (!formData.nama || !formData.telepon || !formData.email) {
      showToast('Nama, Telepon, dan Email wajib diisi.', 'warning');
      return;
    }
    if (modalMode === 'add' && (!formData.jumlah_bayar || Number(formData.jumlah_bayar) <= 0)) {
         showToast('Jumlah pembayaran pendaftaran wajib diisi.', 'warning');
         return;
    }

    setIsSubmitting(true);
    
    // PERSIAPAN DATA YANG DIKIRIM KE LARAVEL (MENGGUNAKAN NAMA KOLOM BE)
    const dataToSend: any = {
      nama_lengkap: formData.nama,       // Mapping nama -> nama_lengkap
      nomor_telepon: formData.telepon,
      email: formData.email,
      alamat: formData.alamat,
      status_pelanggan: formData.status, // Mapping status -> status_pelanggan
    };
    
    try {
      if (modalMode === 'add') {
        // Mode ADD (CREATE + BAYAR): Tambahkan jumlah_bayar
        dataToSend.jumlah_bayar = Number(formData.jumlah_bayar);
        
        await axiosClient.post('/daftaranggota', dataToSend);
        showToast('Anggota berhasil ditambahkan', 'success');
        
      } else if (modalMode === 'edit' && selectedAnggota) {
        // Mode EDIT (UPDATE PROFIL)
        await axiosClient.put(`/daftaranggota/${selectedAnggota.id}`, dataToSend);
        showToast('Data anggota berhasil diperbarui', 'success');
      }
      
      setIsModalOpen(false);
      fetchAnggota(); // Refresh data

    } catch (error: any) {
      const msg = error.response?.data?.message || 'Gagal menyimpan data.';
      showToast(msg, 'error');
      console.error("Submit Error:", error.response);
      
    } finally {
      setIsSubmitting(false);
    }
  };


  const getStatusBadge = (status: string) => {
    const styles = {
      aktif: 'bg-green-100 text-green-700',
      'masa tenggang': 'bg-yellow-100 text-yellow-700',
      nonaktif: 'bg-red-100 text-red-700',
    };
    return styles[status as keyof typeof styles] || '';
  };
  

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header, Filters & Actions... */}
      <div className="mb-6">
        <h1 className="text-gray-900 mb-2">Manajemen Anggota</h1>
        <p className="text-gray-600">Kelola data anggota EcoBurn</p>
      </div>

      {/* Filters & Actions */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Cari nama, email, atau telepon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4C9876] focus:border-transparent"
            />
          </div>

          {/* Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" strokeWidth={1.5} />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-11 pr-8 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4C9876] appearance-none bg-white"
            >
              <option value="semua">Semua Status</option>
              <option value="aktif">Aktif</option>
              <option value="masa tenggang">Masa Tenggang</option>
              <option value="nonaktif">Nonaktif</option>
            </select>
          </div>

          {/* Add Button */}
          <button
            onClick={handleAdd}
            className="bg-[#4C9876] text-white px-4 py-2.5 rounded-xl hover:bg-[#3d7a5e] transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-5 h-5" strokeWidth={1.5} />
            <span>Tambah Anggota</span>
          </button>
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
                    <th className="px-6 py-4 text-left text-gray-700">Nama</th>
                    <th className="px-6 py-4 text-left text-gray-700">Telepon</th>
                    <th className="px-6 py-4 text-left text-gray-700">Email</th>
                    <th className="px-6 py-4 text-left text-gray-700">Alamat</th>
                    <th className="px-6 py-4 text-left text-gray-700">Total Sampah</th>
                    <th className="px-6 py-4 text-left text-gray-700">Status</th>
                    <th className="px-6 py-4 text-left text-gray-700">Pembayaran</th>
                    <th className="px-6 py-4 text-left text-gray-700">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredAnggota.map((anggota) => (
                    <tr key={anggota.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-900">{anggota.nama}</td>
                        <td className="px-6 py-4 text-gray-600">{anggota.telepon}</td>
                        <td className="px-6 py-4 text-gray-600">{anggota.email}</td>
                        <td className="px-6 py-4 text-gray-600">{anggota.alamat}</td>
                        <td className="px-6 py-4 text-gray-600">{anggota.totalSampah} Kg</td>
                        <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm ${getStatusBadge(anggota.status)}`}>
                            {anggota.status}
                        </span>
                        </td>
                        <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm ${anggota.pembayaran === 'lunas' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {anggota.pembayaran}
                        </span>
                        </td>
                        <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleDetail(anggota)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Detail"><Eye className="w-4 h-4" strokeWidth={1.5} /></button>
                            <button onClick={() => handleEdit(anggota)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Edit"><Edit className="w-4 h-4" strokeWidth={1.5} /></button>
                            <button onClick={() => handleDelete(anggota.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus"><Trash2 className="w-4 h-4" strokeWidth={1.5} /></button>
                        </div>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
        )}

        {filteredAnggota.length === 0 && !isLoading && (
          <div className="text-center py-12 text-gray-500">
            Tidak ada data anggota ditemukan
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
                        {modalMode === 'add' && 'Tambah Anggota Baru'}
                        {modalMode === 'edit' && 'Edit Data Anggota'}
                        {modalMode === 'detail' && 'Detail Anggota'}
                    </h2>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg" disabled={isSubmitting}>
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Modal Content */}
                <div className="p-6">
                    {modalMode === 'detail' && selectedAnggota ? (
                        <div className="space-y-4">
                            {/* Detail Content (menggunakan Accessor names) */}
                            <div><label className="block text-gray-600 text-sm mb-1">Nama</label><p className="text-gray-900">{selectedAnggota.nama}</p></div>
                            <div><label className="block text-gray-600 text-sm mb-1">Telepon</label><p className="text-gray-900">{selectedAnggota.telepon}</p></div>
                            <div><label className="block text-gray-600 text-sm mb-1">Email</label><p className="text-gray-900">{selectedAnggota.email}</p></div>
                            <div><label className="block text-gray-600 text-sm mb-1">Alamat</label><p className="text-gray-900">{selectedAnggota.alamat}</p></div>
                            <div><label className="block text-gray-600 text-sm mb-1">Total Sampah Dibakar</label><p className="text-gray-900">{selectedAnggota.totalSampah} Kg</p></div>
                            <div><label className="block text-gray-600 text-sm mb-1">Status</label>
                                <span className={`inline-block px-3 py-1 rounded-full text-sm ${getStatusBadge(selectedAnggota.status)}`}>
                                    {selectedAnggota.status}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                             {/* --- Input Form --- */}
                            <div><label className="block text-gray-700 mb-2">Nama Lengkap</label>
                                <input type="text" value={formData.nama} onChange={(e) => setFormData({ ...formData, nama: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4C9876]" placeholder="Masukkan nama lengkap"/>
                            </div>
                            <div><label className="block text-gray-700 mb-2">Telepon</label>
                                <input type="tel" value={formData.telepon} onChange={(e) => setFormData({ ...formData, telepon: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4C9876]" placeholder="081234567890"/>
                            </div>
                            <div><label className="block text-gray-700 mb-2">Email</label>
                                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4C9876]" placeholder="email@example.com"/>
                            </div>
                            <div><label className="block text-gray-700 mb-2">Alamat</label>
                                <textarea value={formData.alamat} onChange={(e) => setFormData({ ...formData, alamat: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4C9876]" placeholder="Masukkan alamat lengkap" rows={3}/>
                            </div>
                            <div><label className="block text-gray-700 mb-2">Status</label>
                                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4C9876]">
                                    <option value="aktif">Aktif</option>
                                    <option value="masa tenggang">Masa Tenggang</option>
                                    <option value="nonaktif">Nonaktif</option>
                                </select>
                            </div>
                            {/* Input Pembayaran (Hanya saat ADD) */}
                            {modalMode === 'add' && (
                                <div><label className="block text-gray-700 mb-2">Jumlah Pembayaran Pendaftaran (Rp)</label>
                                    <input type="number" value={formData.jumlah_bayar} onChange={(e) => setFormData({ ...formData, jumlah_bayar: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4C9876]" placeholder="Masukkan jumlah bayar"/>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                {/* Modal Footer */}
                <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
                    <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors" disabled={isSubmitting}>Batal</button>
                    {modalMode !== 'detail' && (
                        <button onClick={handleSubmit} className="px-6 py-2.5 bg-[#4C9876] text-white rounded-xl hover:bg-[#3d7a5e] transition-colors flex items-center justify-center gap-2" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            {modalMode === 'add' ? 'Tambah' : 'Simpan'}
                        </button>
                    )}
                </div>
            </div>
        </Modal>
      )}
    </div>
  );
}