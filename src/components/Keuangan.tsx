import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Calendar, Download, X, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import axiosClient from '../api/axiosClient'; // Pastikan path ini benar!

// --- INTERFACE SESUAI OUTPUT BE ---
interface TransaksiData {
    pembayaran_id: number; 
    tanggal_pembayaran: string; 
    sumber_pemasukan: 'pendaftaran' | 'perpanjang' | 'ditempat'; 
    jumlah_bayar: number; 
    status_pembayaran: 'lunas' | 'pending' | 'batal'; 
    
    pelanggan: {
        pelanggan_id: number;
        nama_lengkap: string;
        nomor_telepon: string;
        email: string;
        alamat: string;
        status_pelanggan: 'aktif' | 'masa_tenggang' | 'nonaktif'; 
    } | null;
}

// --- Interface Sederhana untuk Tampilan FE ---
interface DisplayTransaksiData {
    id: number;
    tanggal: string;
    sumber: 'pendaftaran' | 'perpanjang' | 'ditempat';
    nama: string;
    telepon: string;
    email: string;
    alamat: string;
    jumlah: number;
    status: 'aktif' | 'masa tenggang' | 'nonaktif';
}

// --- Lookup Anggota untuk Dropdown ---
interface AnggotaSearch {
    pelanggan_id: number;
    nama_lengkap: string;
}

// --- Interface untuk State Form ---
interface TransaksiForm {
    pelanggan_id: string; 
    sumber: 'pendaftaran' | 'perpanjang' | 'ditempat';
    jumlah: string; 
    keterangan: string;
}


interface KeuanganProps {
    showToast: (message: string, type: 'success' | 'error' | 'warning') => void;
}

export function Keuangan({ showToast }: KeuanganProps) {
    const [transaksiList, setTransaksiList] = useState<TransaksiData[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterSumber, setFilterSumber] = useState<string>('semua');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [anggotaOptions, setAnggotaOptions] = useState<AnggotaSearch[]>([]); 
    const [isAnggotaLoading, setIsAnggotaLoading] = useState(false); // New loading state for dropdown
    
    const [formData, setFormData] = useState<TransaksiForm>({
        pelanggan_id: '', 
        sumber: 'perpanjang', 
        jumlah: '',
        keterangan: '',
    });

    // --- FUNGSI UTILITY: FORMAT MATA UANG (FIX STYLE) ---
    const formatCurrency = (amount: number) => {
        // Fix: Mengembalikan styling font ke normal, tapi menjaga format Rupiah
        return `Rp ${amount.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    };

    // --- FUNGSI UTILITY: MERATAKAN DATA BE ---
    const flattenData = (data: TransaksiData[]): DisplayTransaksiData[] => {
        return data.map(t => ({
            id: t.pembayaran_id,
            tanggal: t.tanggal_pembayaran,
            sumber: t.sumber_pemasukan,
            jumlah: Number(t.jumlah_bayar) || 0, // FIX NaN: Pastikan selalu number/0
            
            // Mengambil data dari relasi (pelanggan)
            nama: t.pelanggan?.nama_lengkap || '—',
            telepon: t.pelanggan?.nomor_telepon || '—',
            email: t.pelanggan?.email || '—',
            alamat: t.pelanggan?.alamat || '—',
            
            // FIX: Mapping status dari snake_case BE ke format tampilan FE
            status: (t.pelanggan?.status_pelanggan === 'masa_tenggang' ? 'masa tenggang' : t.pelanggan?.status_pelanggan as any) || 'nonaktif',
        }));
    };


    // --- FUNGSI ASINKRON: FETCH DATA ANGGOTA (UNTUK DROPDOWN MODAL) ---
    const fetchAnggotaOptions = useCallback(async () => {
        setIsAnggotaLoading(true);
        try {
            const response = await axiosClient.get('/daftaranggota'); 
            const options: AnggotaSearch[] = response.data.map((p: any) => ({ 
                pelanggan_id: p.id, 
                nama_lengkap: p.nama, 
            }));
            setAnggotaOptions(options);
        } catch (error) {
            console.error("Fetch Anggota Options Error:", error);
            showToast('Gagal memuat daftar anggota.', 'error');
        } finally {
            setIsAnggotaLoading(false);
        }
    }, [showToast]);


    // --- FUNGSI ASINKRON: FETCH DATA TRANSAKSI ---
    const fetchTransaksi = useCallback(async () => {
        setIsLoading(true);
        try {
            // Mengirim parameter filter ke BE untuk query yang lebih efisien (termasuk filter tanggal)
            const params = {
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
                sumber: filterSumber === 'semua' ? undefined : filterSumber,
                search: searchQuery || undefined, // Jika BE memiliki logic untuk search di index
            };

            const response = await axiosClient.get('/pembayaran', { params }); 
            setTransaksiList(response.data);
        } catch (error) {
            showToast('Gagal memuat data keuangan.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast, dateFrom, dateTo, filterSumber, searchQuery]);

    useEffect(() => {
        // Debounce fetching transaksi saat filter berubah
        const timer = setTimeout(() => {
            fetchTransaksi();
        }, 300); 

        return () => clearTimeout(timer);
    }, [fetchTransaksi]);
    
    useEffect(() => {
        // Fetch anggota saat komponen dimuat
        fetchAnggotaOptions();
    }, [fetchAnggotaOptions]);


    const mappedTransaksi = flattenData(transaksiList); 

    // FIX NaN: Perhitungan total pemasukan (Pastikan selalu number/0)
    const filteredTransaksi = mappedTransaksi.filter(transaksi => {
        const matchesSearch = transaksi.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            transaksi.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterSumber === 'semua' || transaksi.sumber === filterSumber;
        return matchesSearch && matchesFilter;
    });
    
    const totalPemasukan = filteredTransaksi.reduce((sum, t) => sum + (Number(t.jumlah) || 0), 0);
    // ... (sisa logic) ...

    const handleAdd = () => {
        setFormData({ pelanggan_id: '', sumber: 'perpanjang', jumlah: '', keterangan: '' });
        setIsModalOpen(true);
    };

    // --- FUNGSI ASINKRON: SUBMIT TRANSAKSI BARU ---
    const handleSubmit = async () => {
        // FIX NaN: Konversi aman menggunakan Number()
        const parsedJumlah = Number(formData.jumlah.replace(/,/g, '.')); 

        if (!formData.pelanggan_id || isNaN(parsedJumlah) || parsedJumlah <= 0) {
            showToast('Mohon pilih anggota dan masukkan jumlah pembayaran yang valid.', 'warning');
            return;
        }

        setIsSubmitting(true);
        try {
            const dataToSend = {
                pelanggan_id: Number(formData.pelanggan_id), 
                sumber_pemasukan: formData.sumber,
                jumlah_bayar: parsedJumlah, // Menggunakan nilai number yang sudah dikonversi
                tanggal_pembayaran: new Date().toISOString().split('T')[0],
                keterangan: formData.keterangan || `Pembayaran ${formData.sumber}`,
            };

            await axiosClient.post('/pembayaran', dataToSend);
            showToast('Transaksi berhasil ditambahkan', 'success');
            setIsModalOpen(false);
            fetchTransaksi(); 

        } catch (error: any) {
            const msg = error.response?.data?.message || 'Gagal menyimpan transaksi. Cek ID pelanggan.';
            showToast(msg, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleExport = () => {
        showToast('Data berhasil diekspor (Fungsi simulasi).', 'success');
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            'aktif': 'bg-green-100 text-green-700',
            'masa tenggang': 'bg-yellow-100 text-yellow-700',
            'nonaktif': 'bg-red-100 text-red-700',
        };
        return styles[status as keyof typeof styles] || '';
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-semibold text-gray-900 mb-2">Manajemen Keuangan</h1>
                <p className="text-gray-600">Kelola transaksi dan pemasukan EcoBurn</p>
            </div>

            {/* Summary Card */}
            <div className="bg-gradient-to-br from-[#4C9876] to-[#3d7a5e] rounded-xl p-6 mb-6 text-white shadow-lg">
                <div className="grid md:grid-cols-3 gap-6">
                <div>
                    <p className="text-white/80 text-sm mb-1">Total Pemasukan (Filter)</p>
                    <p className="text-2xl font-semibold text-white">{formatCurrency(totalPemasukan)}</p>
                </div>
                <div>
                    <p className="text-white/80 text-sm mb-1">Total Transaksi (Filter)</p>
                    <p className="text-2xl font-semibold text-white">{filteredTransaksi.length}</p>
                </div>
                <div>
                    <p className="text-white/80 text-sm mb-1">Rata-rata Transaksi (Filter)</p>
                    <p className="text-2xl font-semibold text-white">
                        {formatCurrency(filteredTransaksi.length > 0 ? totalPemasukan / filteredTransaksi.length : 0)}
                    </p>
                </div>
                </div>
            </div>

            {/* Filters & Actions */}
            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100 mb-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Search */}
                <div className="lg:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" strokeWidth={1.5} />
                    <input
                    type="text"
                    placeholder="Cari nama atau email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4C9876]"
                    />
                </div>

                {/* Date From */}
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" strokeWidth={1.5} />
                    <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4C9876] appearance-none"
                    />
                </div>

                {/* Date To */}
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" strokeWidth={1.5} />
                    <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4C9876] appearance-none"
                    />
                </div>

                {/* Filter Sumber */}
                <div>
                    <select
                    value={filterSumber}
                    onChange={(e) => setFilterSumber(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4C9876]"
                    >
                    <option value="semua">Semua Sumber</option>
                    <option value="pendaftaran">Pendaftaran</option>
                    <option value="perpanjang">Perpanjang</option>
                    <option value="ditempat">Ditempat</option>
                    </select>
                </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-4">
                <button
                    onClick={handleAdd}
                    className="bg-[#4C9876] text-white px-4 py-2.5 rounded-xl hover:bg-[#3d7a5e] transition-colors flex items-center gap-2 font-medium"
                >
                    <Plus className="w-5 h-5" strokeWidth={1.5} />
                    <span>Tambah Transaksi</span>
                </button>
                <button
                    onClick={handleExport}
                    className="border border-[#4C9876] text-[#4C9876] px-4 py-2.5 rounded-xl hover:bg-[#4C9876] hover:text-white transition-colors flex items-center gap-2 font-medium"
                >
                    <Download className="w-5 h-5" strokeWidth={1.5} />
                    <span>Export Data</span>
                </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
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
                                <th className="px-6 py-4 text-left text-gray-700 whitespace-nowrap">Sumber</th>
                                <th className="px-6 py-4 text-left text-gray-700 whitespace-nowrap">Nama Anggota</th>
                                <th className="px-6 py-4 text-left text-gray-700 whitespace-nowrap">Telepon</th>
                                <th className="px-6 py-4 text-left text-gray-700 whitespace-nowrap">Status</th>
                                <th className="px-6 py-4 text-left text-gray-700 whitespace-nowrap">Jumlah</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                            {filteredTransaksi.map((transaksi) => (
                                <tr key={transaksi.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{new Date(transaksi.tanggal).toLocaleDateString('id-ID')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                            transaksi.sumber === 'pendaftaran' 
                                                ? 'bg-blue-100 text-blue-700' 
                                                : transaksi.sumber === 'perpanjang'
                                                    ? 'bg-purple-100 text-purple-700'
                                                    : 'bg-gray-100 text-gray-700'
                                        }`}>
                                            {transaksi.sumber.charAt(0).toUpperCase() + transaksi.sumber.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-900 whitespace-nowrap">{transaksi.nama}</td>
                                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{transaksi.telepon}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(transaksi.status)}`}>
                                            {transaksi.status.charAt(0).toUpperCase() + transaksi.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-900 font-semibold whitespace-nowrap">{formatCurrency(transaksi.jumlah)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {filteredTransaksi.length === 0 && !isLoading && (
                <div className="text-center py-12 text-gray-500">
                    Tidak ada data transaksi ditemukan
                </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <Modal onClose={() => setIsModalOpen(false)}>
                    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">Tambah Transaksi Baru</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg" disabled={isSubmitting}>
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-5">
                            
                            {/* Input: Pilih Anggota (Lookup) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="anggota-select">Pilih Anggota <span className="text-red-500">*</span></label>
                                <select
                                    id="anggota-select"
                                    value={formData.pelanggan_id}
                                    onChange={(e) => setFormData({ ...formData, pelanggan_id: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4C9876]"
                                >
                                    <option value="">— Pilih Anggota —</option>
                                    {isAnggotaLoading ? (
                                        <option disabled>Memuat data...</option>
                                    ) : (
                                        anggotaOptions.map(member => (
                                            <option key={member.pelanggan_id} value={member.pelanggan_id}>
                                                {member.nama_lengkap} (ID: {member.pelanggan_id})
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>
                            
                            {/* Input: Sumber Pemasukan */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="sumber-select">Sumber Transaksi <span className="text-red-500">*</span></label>
                                <select
                                    id="sumber-select"
                                    value={formData.sumber}
                                    onChange={(e) => setFormData({ ...formData, sumber: e.target.value as any })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4C9876]"
                                >
                                    <option value="perpanjang">Perpanjang</option>
                                    <option value="ditempat">Ditempat</option>
                                </select>
                            </div>

                            {/* Input: Jumlah Pembayaran */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="jumlah-input">Jumlah Pembayaran (Rp) <span className="text-red-500">*</span></label>
                                <input
                                    id="jumlah-input"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.jumlah}
                                    onChange={(e) => setFormData({ ...formData, jumlah: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4C9876]"
                                    placeholder="100000.00"
                                />
                                <p className="text-xs text-gray-500 mt-1">Gunakan titik (.) sebagai pemisah desimal, jika ada.</p>
                            </div>
                            
                            {/* Input: Keterangan */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="keterangan-input">Keterangan (Opsional)</label>
                                <textarea
                                    id="keterangan-input"
                                    value={formData.keterangan}
                                    onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4C9876]"
                                    placeholder="Bayar tunai untuk bulan depan"
                                    rows={2}
                                />
                            </div>
                            
                        </div>

                        {/* Modal Footer */}
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
                                <span>{isSubmitting ? 'Memproses...' : 'Tambah Transaksi'}</span>
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}