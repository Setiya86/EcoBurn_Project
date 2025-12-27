import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit, Trash2, Eye, X, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import axiosClient from '../api/axiosClient'; // Pastikan path ini benar!

// --- INTERFACE DATA ---
// Data ini didasarkan pada Accessor yang sudah kita buat di Model Aktivitas BE.
interface PembakaranData {
    id: number; // aktivitas_id
    namaAnggota: string; // dari Pelanggan.nama_lengkap atau default
    jenisPembakaran: 'sekali' | 'langganan'; 
    beratSampah: number; // dari Aktivitas.jumlah_kg
    statusProses: 'pending' | 'proses' | 'selesai'; // dari Aktivitas.status_proses
    namaTobong: string; // dari Tobong.nama_tobong
    tanggal: string; // dari Aktivitas.waktu_pencatatan (YYYY-MM-DD)
    jumlahUang?: number; // dari Pembakaran.total_biaya
}

// Interface untuk data lookup Anggota
interface AnggotaSearch {
    pelanggan_id: number;
    nama_lengkap: string;
}

// Interface untuk data lookup Tobong
interface TobongSearch {
    tobong_id: number;
    nama_tobong: string;
}

// Interface untuk State Form
interface PembakaranForm {
    jenisPembakaran: 'sekali' | 'langganan';
    namaAnggota: string; // Bisa nama anggota (langganan) atau nama pembakar (sekali)
    beratSampah: string;
    namaTobong: string; 
    jumlahUang: string;
    statusProses: 'pending' | 'proses' | 'selesai';
}

interface PembakaranSampahProps {
    showToast: (message: string, type: 'success' | 'error' | 'warning') => void;
}

// --- KOMPONEN UTAMA ---
export function PembakaranSampah({ showToast }: PembakaranSampahProps) {
    const [pembakaranList, setPembakaranList] = useState<PembakaranData[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit' | 'detail'>('add');
    const [selectedPembakaran, setSelectedPembakaran] = useState<PembakaranData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // State untuk Dropdown (Data dari API)
    const [anggotaOptions, setAnggotaOptions] = useState<AnggotaSearch[]>([]); 
    const [tobongOptions, setTobongOptions] = useState<TobongSearch[]>([]); 
    
    // Default form state
    const [formData, setFormData] = useState<PembakaranForm>({
        jenisPembakaran: 'langganan',
        namaAnggota: '', 
        beratSampah: '',
        namaTobong: '', 
        jumlahUang: '',
        statusProses: 'pending',
    });

    // --- FUNGSI ASINKRON: FETCH DATA LOOKUP ---

    const fetchAnggotaOptions = useCallback(async () => {
        try {
            const response = await axiosClient.get('/daftaranggota'); 
            const options: AnggotaSearch[] = response.data.map((p: any) => ({ 
                pelanggan_id: p.id, 
                nama_lengkap: p.nama, 
            }));
            setAnggotaOptions(options);
        } catch (error) {
            console.error("Fetch Anggota Options Error:", error);
        }
    }, []);
    
    const fetchTobongOptions = useCallback(async () => {
        try {
            const response = await axiosClient.get('/daftartobong'); 
            const options: TobongSearch[] = response.data;
            setTobongOptions(options);
            
            // Set default namaTobong ke yang pertama jika belum ada
            if (options.length > 0) {
                setFormData(prev => ({ ...prev, namaTobong: prev.namaTobong || options[0].nama_tobong }));
            }
        } catch (error) {
            console.error("Fetch Tobong Options Error:", error);
        }
    }, []);
    
    // 1. Fetch Daftar Pembakaran
    const fetchPembakaranList = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = { search: searchQuery || undefined };
            const response = await axiosClient.get('/riwayat', { params }); 
            setPembakaranList(response.data); 
        } catch (error) {
            console.error("Fetch Pembakaran Error:", error);
            showToast('Gagal memuat data pembakaran.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast, searchQuery]);

    // --- EFFECT HOOKS ---
    
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPembakaranList();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchPembakaranList]);
    
    useEffect(() => {
        fetchAnggotaOptions();
        fetchTobongOptions();
    }, [fetchAnggotaOptions, fetchTobongOptions]);


    // --- HANDLER MODAL & CRUD ---

    const handleAdd = () => {
        setModalMode('add');
        // Inisialisasi default form
        setFormData({
            jenisPembakaran: 'langganan',
            namaAnggota: '',
            beratSampah: '',
            namaTobong: tobongOptions[0]?.nama_tobong || '', // Default dari data lookup
            jumlahUang: '',
            statusProses: 'pending',
        });
        setIsModalOpen(true);
    };

    const handleEdit = (pembakaran: PembakaranData) => {
        setModalMode('edit');
        setSelectedPembakaran(pembakaran);
        setFormData({
            jenisPembakaran: pembakaran.jenisPembakaran,
            namaAnggota: pembakaran.namaAnggota, 
            beratSampah: pembakaran.beratSampah.toString(),
            namaTobong: pembakaran.namaTobong,
            jumlahUang: pembakaran.jumlahUang?.toString() || '',
            statusProses: pembakaran.statusProses,
        });
        setIsModalOpen(true);
    };

    const handleDetail = (pembakaran: PembakaranData) => {
        setModalMode('detail');
        setSelectedPembakaran(pembakaran);
        setIsModalOpen(true);
    };
    
    // Handler Submit (Add/Edit)
    const handleSubmit = async () => {
        // --- Validasi Frontend ---
        if (!formData.namaAnggota || !formData.beratSampah || Number(formData.beratSampah) <= 0) {
            showToast('Mohon lengkapi data anggota/pembakar dan berat sampah yang valid.', 'warning');
            return;
        }
        if (formData.jenisPembakaran === 'sekali' && (!formData.jumlahUang || Number(formData.jumlahUang) <= 0)) {
            showToast('Mohon masukkan jumlah pembayaran (sekali bakar) yang valid.', 'warning');
            return;
        }
        if (!formData.namaTobong) {
            showToast('Mohon pilih Tobong yang digunakan.', 'warning');
            return;
        }

        setIsSubmitting(true);
        
        try {
            // Data yang dikirim ke BE (menggunakan nama Accessor/Kolom FE)
            const dataToSend = {
                jenisPembakaran: formData.jenisPembakaran, 
                namaAnggota: formData.namaAnggota, // BE akan memetakan ini ke ID atau membiarkan sebagai nama umum
                beratSampah: Number(formData.beratSampah),
                namaTobong: formData.namaTobong,
                statusProses: formData.statusProses,
                jumlahUang: formData.jenisPembakaran === 'sekali' ? Number(formData.jumlahUang) : null,
            };

            if (modalMode === 'add') {
                // POST /riwayat
                await axiosClient.post('/riwayat', dataToSend);
                showToast('Data pembakaran berhasil ditambahkan', 'success');
            } else if (modalMode === 'edit' && selectedPembakaran) {
                // PUT /riwayat/{id}
                await axiosClient.put(`/riwayat/${selectedPembakaran.id}`, dataToSend);
                showToast('Data pembakaran berhasil diperbarui', 'success');
            }

            setIsModalOpen(false);
            fetchPembakaranList(); // Refresh data

        } catch (error: any) {
            const msg = error.response?.data?.message || 'Gagal menyimpan data pembakaran.';
            console.error("Submit Error:", error.response?.data);
            showToast(msg, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };


    const handleDelete = async (id: number) => {
        if (!confirm('Apakah Anda yakin ingin menghapus data pembakaran ini? Tindakan ini akan mengurangi total sampah anggota.')) {
            return;
        }
        
        try {
            await axiosClient.delete(`/riwayat/${id}`);
            showToast('Data pembakaran berhasil dihapus', 'success');
            fetchPembakaranList(); // Refresh data

        } catch (error: any) {
            const msg = error.response?.data?.message || 'Gagal menghapus data pembakaran.';
            showToast(msg, 'error');
        }
    };

    // --- UTILITY JSX ---

    const getStatusBadge = (status: string) => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-700',
            proses: 'bg-blue-100 text-blue-700',
            selesai: 'bg-green-100 text-green-700',
        };
        return styles[status as keyof typeof styles] || '';
    };

    const formatCurrency = (amount: number) => {
        return `Rp ${amount.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };
    
    const filteredPembakaran = pembakaranList.filter(pembakaran =>
        pembakaran.namaAnggota.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pembakaran.namaTobong.toLowerCase().includes(searchQuery.toLowerCase())
    );


    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-semibold text-gray-900 mb-2">Pembakaran Sampah</h1>
                <p className="text-gray-600">Kelola data pembakaran sampah anggota</p>
            </div>

            {/* Filters & Actions */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" strokeWidth={1.5} />
                        <input
                            type="text"
                            placeholder="Cari nama anggota atau tobong..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4C9876]"
                        />
                    </div>

                    {/* Add Button */}
                    <button
                        onClick={handleAdd}
                        className="bg-[#4C9876] text-white px-4 py-2.5 rounded-xl hover:bg-[#3d7a5e] transition-colors flex items-center justify-center gap-2 whitespace-nowrap font-medium"
                    >
                        <Plus className="w-5 h-5" strokeWidth={1.5} />
                        <span>Tambah Pembakaran</span>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="text-center py-12 text-gray-500 flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" /> Memuat data...
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-gray-700 whitespace-nowrap">Tanggal</th>
                                    <th className="px-6 py-4 text-left text-gray-700 whitespace-nowrap">Nama Anggota</th>
                                    <th className="px-6 py-4 text-left text-gray-700 whitespace-nowrap">Jenis</th>
                                    <th className="px-6 py-4 text-left text-gray-700 whitespace-nowrap">Berat Sampah</th>
                                    <th className="px-6 py-4 text-left text-gray-700 whitespace-nowrap">Tobong</th>
                                    <th className="px-6 py-4 text-left text-gray-700 whitespace-nowrap">Status</th>
                                    <th className="px-6 py-4 text-left text-gray-700 whitespace-nowrap">Pembayaran</th>
                                    <th className="px-6 py-4 text-left text-gray-700 whitespace-nowrap">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredPembakaran.map((pembakaran) => (
                                    <tr key={pembakaran.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-gray-600">{new Date(pembakaran.tanggal).toLocaleDateString('id-ID')}</td>
                                        <td className="px-6 py-4 text-gray-900">{pembakaran.namaAnggota}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                pembakaran.jenisPembakaran === 'langganan' 
                                                    ? 'bg-purple-100 text-purple-700' 
                                                    : 'bg-orange-100 text-orange-700'
                                            }`}>
                                                {pembakaran.jenisPembakaran}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{pembakaran.beratSampah} Kg</td>
                                        <td className="px-6 py-4 text-gray-600">{pembakaran.namaTobong}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(pembakaran.statusProses)}`}>
                                                {pembakaran.statusProses}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                                            {pembakaran.jumlahUang ? formatCurrency(pembakaran.jumlahUang) : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleDetail(pembakaran)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Detail"
                                                >
                                                    <Eye className="w-4 h-4" strokeWidth={1.5} />
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(pembakaran)}
                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit className="w-4 h-4" strokeWidth={1.5} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(pembakaran.id)}
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
                    )}
                </div>

                {filteredPembakaran.length === 0 && !isLoading && (
                    <div className="text-center py-12 text-gray-500">
                        Tidak ada data pembakaran ditemukan
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <Modal onClose={() => setIsModalOpen(false)}>
                    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">
                                {modalMode === 'add' && 'Tambah Data Pembakaran'}
                                {modalMode === 'edit' && 'Edit Data Pembakaran'}
                                {modalMode === 'detail' && 'Detail Pembakaran'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg" disabled={isSubmitting}>
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6">
                            {modalMode === 'detail' && selectedPembakaran ? (
                                <div className="space-y-4 text-sm">
                                    {/* Tampilan Detail sama seperti kode lama */}
                                    <div><label className="block text-gray-600 mb-1">Tanggal</label>
                                        <p className="text-gray-900">{new Date(selectedPembakaran.tanggal).toLocaleDateString('id-ID')}</p>
                                    </div>
                                    <div><label className="block text-gray-600 mb-1">Nama Anggota</label>
                                        <p className="text-gray-900">{selectedPembakaran.namaAnggota}</p>
                                    </div>
                                    <div><label className="block text-gray-600 mb-1">Jenis Pembakaran</label>
                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                                            selectedPembakaran.jenisPembakaran === 'langganan' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                                        }`}>{selectedPembakaran.jenisPembakaran}</span>
                                    </div>
                                    <div><label className="block text-gray-600 mb-1">Berat Sampah</label>
                                        <p className="text-gray-900">{selectedPembakaran.beratSampah} Kg</p>
                                    </div>
                                    <div><label className="block text-gray-600 mb-1">Tobong</label>
                                        <p className="text-gray-900">{selectedPembakaran.namaTobong}</p>
                                    </div>
                                    <div><label className="block text-gray-600 mb-1">Status Proses</label>
                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedPembakaran.statusProses)}`}>
                                            {selectedPembakaran.statusProses}
                                        </span>
                                    </div>
                                    {selectedPembakaran.jumlahUang && (
                                        <div><label className="block text-gray-600 mb-1">Pembayaran</label>
                                            <p className="text-gray-900">{formatCurrency(selectedPembakaran.jumlahUang)}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Input: Jenis Pembakaran */}
                                    <div>
                                        <label className="block text-gray-700 mb-2 font-medium">Jenis Pembakaran</label>
                                        <select
                                            value={formData.jenisPembakaran}
                                            onChange={(e) => setFormData({ ...formData, jenisPembakaran: e.target.value as 'sekali' | 'langganan', namaAnggota: '', jumlahUang: '' })}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4C9876]"
                                            disabled={isSubmitting}
                                        >
                                            <option value="langganan">Langganan</option>
                                            <option value="sekali">Sekali Pembakaran</option>
                                        </select>
                                    </div>

                                    {/* Input: Nama Anggota/Pembakar */}
                                    <div>
                                        <label className="block text-gray-700 mb-2 font-medium">
                                            {formData.jenisPembakaran === 'langganan' ? 'Pilih Anggota' : 'Nama Pembakar'}
                                        </label>
                                        {formData.jenisPembakaran === 'langganan' ? (
                                            <select
                                                value={formData.namaAnggota}
                                                onChange={(e) => setFormData({ ...formData, namaAnggota: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4C9876]"
                                                disabled={isSubmitting}
                                            >
                                                <option value="">Pilih Anggota</option>
                                                {anggotaOptions.map(anggota => (
                                                    <option key={anggota.pelanggan_id} value={anggota.nama_lengkap}>{anggota.nama_lengkap}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                value={formData.namaAnggota}
                                                onChange={(e) => setFormData({ ...formData, namaAnggota: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4C9876]"
                                                placeholder="Masukkan nama pembakar"
                                                disabled={isSubmitting}
                                            />
                                        )}
                                    </div>

                                    {/* Input: Berat Sampah */}
                                    <div>
                                        <label className="block text-gray-700 mb-2 font-medium">Berat Sampah (Kg)</label>
                                        <input
                                            type="number"
                                            value={formData.beratSampah}
                                            onChange={(e) => setFormData({ ...formData, beratSampah: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4C9876]"
                                            placeholder="Masukkan berat sampah"
                                            disabled={isSubmitting}
                                        />
                                    </div>

                                    {/* Input: Jumlah Uang (Hanya Sekali Bakar) */}
                                    {formData.jenisPembakaran === 'sekali' && (
                                        <div>
                                            <label className="block text-gray-700 mb-2 font-medium">Jumlah Uang (Rp)</label>
                                            <input
                                                type="number"
                                                value={formData.jumlahUang}
                                                onChange={(e) => setFormData({ ...formData, jumlahUang: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4C9876]"
                                                placeholder="Masukkan jumlah pembayaran"
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                    )}

                                    {/* Input: Tobong yang Digunakan */}
                                    <div>
                                        <label className="block text-gray-700 mb-2 font-medium">Tobong yang Digunakan</label>
                                        <select
                                            value={formData.namaTobong}
                                            onChange={(e) => setFormData({ ...formData, namaTobong: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4C9876]"
                                            disabled={isSubmitting}
                                        >
                                            {tobongOptions.map(tobong => (
                                                <option key={tobong.tobong_id} value={tobong.nama_tobong}>{tobong.nama_tobong}</option>
                                            ))}
                                            {tobongOptions.length === 0 && <option value="" disabled>Memuat Tobong...</option>}
                                        </select>
                                    </div>

                                    {/* Input: Status Proses */}
                                    <div>
                                        <label className="block text-gray-700 mb-2 font-medium">Status Proses</label>
                                        <select
                                            value={formData.statusProses}
                                            onChange={(e) => setFormData({ ...formData, statusProses: e.target.value as any })}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4C9876]"
                                            disabled={isSubmitting}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="proses">Proses</option>
                                            <option value="selesai">Selesai</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        {modalMode !== 'detail' && (
                            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                                    disabled={isSubmitting}
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    className="px-6 py-2.5 bg-[#4C9876] text-white rounded-xl hover:bg-[#3d7a5e] transition-colors flex items-center justify-center gap-2 font-medium"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    <span>{modalMode === 'add' ? 'Tambah' : 'Simpan'}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
}