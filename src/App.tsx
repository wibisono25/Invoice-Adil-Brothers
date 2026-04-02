/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Printer, 
  ReceiptText, 
  Plus, 
  History,
  Trash2,
  Edit3,
  Save,
  Download,
  Loader2
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from './lib/supabase';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type TabType = 'eceran' | 'umkm' | 'pakan';
type NavType = 'editor' | 'history';

interface InvoiceRecord {
  id: string;
  invNumber: string;
  category: TabType;
  buyer: string;
  date: string;
  time: string;
  qty: number;
  price: number;
  notes: string;
  shipping: number;
  debt: number;
  type: string;
  createdAt: string;
}

interface BuyerRecord {
  id: string;
  name: string;
}

const LOGO_URL = "https://lh3.googleusercontent.com/aida/ADBb0ugXAfjfI316Q_CGqS44TM4CBAEuvBP2Am6HEc-g-58fPagzd479bOFl8VHim0fXbdwjj0EeR3FsI1nXzqhUxaGSnGstBsqK4tJ6CxkQmJ6J18E4mYKBtjzs40hH1eJApoDYjA7x4Uo1CCJRklKanQaDOVzg6xJLyWsDldF8HDDdtwpVfXd0Nx46mSALfPkgR8lxzYP7-gurVpijHhqPQH6R7HIIoNrlrOtTL_d_r3i9eIfQBVTTX0Y8O-uNvcoTL2NXqIdlsrKDA9w";

export default function App() {
  const [activeNav, setActiveNav] = useState<NavType>('editor');
  const [activeTab, setActiveTab] = useState<TabType>('eceran');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [umkmBuyers, setUmkmBuyers] = useState<BuyerRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [data, setData] = useState({
    buyer: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    qty: 5,
    price: 15000,
    notes: '',
    shipping: 0,
    debt: 0,
    type: 'Konsentrat'
  });

  const [invNumber, setInvNumber] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [invoiceToDownload, setInvoiceToDownload] = useState<InvoiceRecord | null>(null);
  
  // Modal states
  const [isAddBuyerModalOpen, setIsAddBuyerModalOpen] = useState(false);
  const [newBuyerName, setNewBuyerName] = useState('');
  const [isAddingBuyer, setIsAddingBuyer] = useState(false);
  const [isDeleteBuyerModalOpen, setIsDeleteBuyerModalOpen] = useState(false);
  const [buyerToDelete, setBuyerToDelete] = useState('');
  const [isDeletingBuyer, setIsDeletingBuyer] = useState(false);
  const [isDeleteInvoiceModalOpen, setIsDeleteInvoiceModalOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  const [isDeletingInvoice, setIsDeletingInvoice] = useState(false);

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch Invoices
        const { data: invData, error: invError } = await supabase
          .from('invoices')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (invError) throw invError;
        
        const mappedInvoices: InvoiceRecord[] = (invData || []).map(item => ({
          id: item.id,
          invNumber: item.inv_number,
          category: item.category as TabType,
          buyer: item.buyer,
          date: item.date,
          time: item.time,
          qty: item.qty,
          price: item.price,
          notes: item.notes,
          shipping: item.shipping,
          debt: item.debt,
          type: item.type,
          createdAt: item.created_at
        }));
        
        setInvoices(mappedInvoices);

        // Fetch Buyers
        const { data: buyerData, error: buyerError } = await supabase
          .from('umkm_buyers')
          .select('*')
          .order('name', { ascending: true });
        
        if (buyerError) throw buyerError;
        setUmkmBuyers(buyerData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!editingId) {
      const yyyymmdd = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const random = Math.floor(1000 + Math.random() * 9000);
      setInvNumber(`INV-${yyyymmdd}-${random}`);
    }
  }, [editingId, activeNav]);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatDateIndo = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const subtotal = data.qty * data.price;
  const total = subtotal + data.shipping + data.debt;

  const handlePrint = () => {
    // Ensure the preview is visible before printing
    const preview = document.getElementById('invoice-preview');
    if (preview) {
      window.print();
    } else {
      alert("Pratinjau invoice tidak ditemukan.");
    }
  };

  const handleAddBuyer = () => {
    setIsAddBuyerModalOpen(true);
    setNewBuyerName('');
  };

  const confirmAddBuyer = async () => {
    if (!newBuyerName.trim()) return;
    
    if (umkmBuyers.some(b => b.name === newBuyerName.trim())) {
      alert("Nama pembeli sudah ada.");
      return;
    }
    
    setIsAddingBuyer(true);
    try {
      const { data: newBuyer, error } = await supabase
        .from('umkm_buyers')
        .insert([{ name: newBuyerName.trim() }])
        .select()
        .single();
      
      if (error) throw error;
      
      setUmkmBuyers(prev => [...prev, newBuyer].sort((a, b) => a.name.localeCompare(b.name)));
      setData({ ...data, buyer: newBuyerName.trim() });
      setIsAddBuyerModalOpen(false);
    } catch (error) {
      console.error('Error adding buyer:', error);
      alert('Gagal menambah pembeli.');
    } finally {
      setIsAddingBuyer(false);
    }
  };

  const handleDeleteBuyer = (name: string) => {
    setBuyerToDelete(name);
    setIsDeleteBuyerModalOpen(true);
  };

  const confirmDeleteBuyer = async () => {
    if (!buyerToDelete) return;
    
    setIsDeletingBuyer(true);
    try {
      const { error } = await supabase
        .from('umkm_buyers')
        .delete()
        .eq('name', buyerToDelete);
      
      if (error) throw error;
      
      setUmkmBuyers(umkmBuyers.filter(b => b.name !== buyerToDelete));
      if (data.buyer === buyerToDelete) {
        setData({ ...data, buyer: '' });
      }
      setIsDeleteBuyerModalOpen(false);
    } catch (error) {
      console.error('Error deleting buyer:', error);
      alert('Gagal menghapus pembeli.');
    } finally {
      setIsDeletingBuyer(false);
    }
  };

  const handleSave = async () => {
    const invoiceData = {
      inv_number: invNumber,
      category: activeTab,
      buyer: data.buyer,
      date: data.date,
      time: data.time,
      qty: data.qty,
      price: data.price,
      notes: data.notes,
      shipping: data.shipping,
      debt: data.debt,
      type: data.type
    };

    try {
      if (editingId) {
        const { data: updated, error } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', editingId)
          .select()
          .single();
        
        if (error) throw error;
        
        const mapped: InvoiceRecord = {
          id: updated.id,
          invNumber: updated.inv_number,
          category: updated.category as TabType,
          buyer: updated.buyer,
          date: updated.date,
          time: updated.time,
          qty: updated.qty,
          price: updated.price,
          notes: updated.notes,
          shipping: updated.shipping,
          debt: updated.debt,
          type: updated.type,
          createdAt: updated.created_at
        };
        
        setInvoices(invoices.map(inv => inv.id === editingId ? mapped : inv));
        setEditingId(null);
      } else {
        const { data: inserted, error } = await supabase
          .from('invoices')
          .insert([invoiceData])
          .select()
          .single();
        
        if (error) throw error;
        
        const mapped: InvoiceRecord = {
          id: inserted.id,
          invNumber: inserted.inv_number,
          category: inserted.category as TabType,
          buyer: inserted.buyer,
          date: inserted.date,
          time: inserted.time,
          qty: inserted.qty,
          price: inserted.price,
          notes: inserted.notes,
          shipping: inserted.shipping,
          debt: inserted.debt,
          type: inserted.type,
          createdAt: inserted.created_at
        };
        
        setInvoices([mapped, ...invoices]);
      }

      // Reset form
      setData({
        buyer: '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
        qty: 5,
        price: 15000,
        notes: '',
        shipping: 0,
        debt: 0,
        type: 'Konsentrat'
      });
      
      setActiveNav('history');
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('Gagal menyimpan invoice.');
    }
  };

  const handleEdit = (inv: InvoiceRecord) => {
    setData({
      buyer: inv.buyer,
      date: inv.date,
      time: inv.time,
      qty: inv.qty,
      price: inv.price,
      notes: inv.notes,
      shipping: inv.shipping,
      debt: inv.debt,
      type: inv.type
    });
    setInvNumber(inv.invNumber);
    setActiveTab(inv.category);
    setEditingId(inv.id);
    setActiveNav('editor');
  };

  const handleDelete = (id: string) => {
    setInvoiceToDelete(id);
    setIsDeleteInvoiceModalOpen(true);
  };

  const confirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    
    setIsDeletingInvoice(true);
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceToDelete);
      
      if (error) throw error;
      
      setInvoices(invoices.filter(inv => inv.id !== invoiceToDelete));
      setIsDeleteInvoiceModalOpen(false);
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Gagal menghapus invoice.');
    } finally {
      setIsDeletingInvoice(false);
    }
  };

  const handleNew = () => {
    setEditingId(null);
    setData({
      buyer: '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      qty: 5,
      price: 15000,
      notes: '',
      shipping: 0,
      debt: 0,
      type: 'Konsentrat'
    });
    setActiveNav('editor');
  };

  const handleDownload = async (inv: InvoiceRecord) => {
    setInvoiceToDownload(inv);
    setIsDownloading(true);
    
    // Wait for the hidden element to render
    setTimeout(async () => {
      const element = document.getElementById('invoice-download-target');
      if (!element) {
        setIsDownloading(false);
        setInvoiceToDownload(null);
        return;
      }

      try {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a5'
        });

        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${inv.invNumber}.pdf`);
      } catch (error) {
        console.error("PDF Generation failed", error);
        alert("Gagal mengunduh PDF. Silakan coba lagi.");
      } finally {
        setIsDownloading(false);
        setInvoiceToDownload(null);
      }
    }, 100);
  };

  return (
    <div className="min-h-screen pb-32">
      {/* Hidden Download Target */}
      {invoiceToDownload && (
        <div className="fixed -left-[9999px] top-0">
          <div 
            id="invoice-download-target"
            className="bg-white p-8 w-[148mm] min-h-[210mm] text-on-surface flex flex-col"
          >
            {/* Header */}
            <div className="flex justify-between items-stretch mb-6 bg-primary text-white -mx-8 -mt-8 p-8">
              <div className="flex items-center gap-3">
                <img 
                  src={LOGO_URL} 
                  alt="Logo" 
                  className="h-10 w-auto object-contain bg-primary p-1 rounded-sm mix-blend-screen"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="font-display font-black text-sm text-white uppercase leading-tight">
                    UD Adil Brothers
                  </h4>
                  <p className="text-[8px] font-bold text-primary-container italic">
                    Supplier Susu Segar
                  </p>
                </div>
              </div>
              <div className="text-right flex flex-col justify-center">
                <h5 className="font-display font-black text-lg text-white tracking-tighter leading-none">
                  INVOICE
                </h5>
                <p className="text-[8px] font-bold text-[#ffffffcc] mt-1">
                  #{invoiceToDownload.invNumber}
                </p>
              </div>
            </div>

            {/* Transaction Info */}
            <div className="grid grid-cols-2 gap-4 mb-6 pt-4 border-t border-dashed border-[#bfc8cd66]">
              <div className="space-y-1">
                <p className="text-[7px] font-bold text-on-surface-variant uppercase tracking-widest">
                  DITAGIHKAN KEPADA
                </p>
                <p className="text-[10px] font-black text-on-surface leading-tight">
                  {invoiceToDownload.buyer || (invoiceToDownload.category === 'eceran' ? 'Umum / Eceran' : invoiceToDownload.category === 'pakan' ? 'Pembelian Pakan' : '-')}
                </p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-[7px] font-bold text-on-surface-variant uppercase tracking-widest">
                  TANGGAL TRANSAKSI
                </p>
                <p className="text-[9px] font-bold text-on-surface">
                  {formatDateIndo(invoiceToDownload.date)} | {invoiceToDownload.time} WIB
                </p>
              </div>
            </div>

            {/* Table */}
            <div className="flex-grow">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#0c678033]">
                    <th className="py-2 text-[8px] font-bold text-on-surface-variant uppercase">No</th>
                    <th className="py-2 text-[8px] font-bold text-on-surface-variant uppercase">Keterangan</th>
                    <th className="py-2 text-[8px] font-bold text-on-surface-variant uppercase text-center">
                      Qty ({invoiceToDownload.category === 'pakan' ? 'U' : 'L'})
                    </th>
                    <th className="py-2 text-[8px] font-bold text-on-surface-variant uppercase text-right">
                      Harga/{invoiceToDownload.category === 'pakan' ? 'U' : 'L'}
                    </th>
                    <th className="py-2 text-[8px] font-bold text-on-surface-variant uppercase text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="text-[9px]">
                  <tr className="border-b border-[#bfc8cd1a]">
                    <td className="py-3">1</td>
                    <td className="py-3 font-bold">
                      {invoiceToDownload.category === 'pakan' ? `Pakan: ${invoiceToDownload.type}` : 'Susu Sapi Segar'}
                    </td>
                    <td className="py-3 text-center">{invoiceToDownload.qty}</td>
                    <td className="py-3 text-right">{formatRupiah(invoiceToDownload.price)}</td>
                    <td className="py-3 text-right font-black">{formatRupiah(invoiceToDownload.qty * invoiceToDownload.price)}</td>
                  </tr>
                  {invoiceToDownload.shipping > 0 && (
                    <tr className="border-b border-[#bfc8cd1a]">
                      <td className="py-3">2</td>
                      <td className="py-3 font-bold">Ongkos Kirim</td>
                      <td className="py-3 text-center">-</td>
                      <td className="py-3 text-right">-</td>
                      <td className="py-3 text-right font-black">{formatRupiah(invoiceToDownload.shipping)}</td>
                    </tr>
                  )}
                  {invoiceToDownload.debt > 0 && (
                    <tr className="border-b border-[#bfc8cd1a]">
                      <td className="py-3">{invoiceToDownload.shipping > 0 ? 3 : 2}</td>
                      <td className="py-3 font-bold">Piutang Sebelumnya</td>
                      <td className="py-3 text-center">-</td>
                      <td className="py-3 text-right">-</td>
                      <td className="py-3 text-right font-black">{formatRupiah(invoiceToDownload.debt)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-4 pt-4 border-t-2 border-[#87ceeb33]">
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[8px] text-on-surface-variant font-medium">
                  <p>Subtotal Produk</p>
                  <p>{formatRupiah(invoiceToDownload.qty * invoiceToDownload.price)}</p>
                </div>
                {invoiceToDownload.shipping > 0 && (
                  <div className="flex justify-between items-center text-[8px] text-on-surface-variant font-medium">
                    <p>Ongkos Kirim</p>
                    <p>{formatRupiah(invoiceToDownload.shipping)}</p>
                  </div>
                )}
                {invoiceToDownload.debt > 0 && (
                  <div className="flex justify-between items-center text-[8px] text-on-surface-variant font-medium">
                    <p>Piutang Sebelumnya</p>
                    <p>{formatRupiah(invoiceToDownload.debt)}</p>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center mt-3 py-2.5 bg-[#0c67800d] px-3 rounded-md">
                <p className="text-[9px] font-black text-[#0c6780] uppercase tracking-widest">
                  TOTAL KESELURUHAN
                </p>
                <p className="text-xs font-black text-[#0c6780]">
                  {formatRupiah(invoiceToDownload.qty * invoiceToDownload.price + invoiceToDownload.shipping + invoiceToDownload.debt)}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-[#bfc8cd33]">
              <p className="text-center text-[8px] italic text-on-surface-variant mb-6">
                {invoiceToDownload.notes ? `"${invoiceToDownload.notes}"` : `"Terima kasih atas kepercayaan Anda memilih produk kami."`}
              </p>
              <div className="grid grid-cols-2 gap-12 text-center text-[9px] font-bold">
                <div className="space-y-12">
                  <p>Penerima</p>
                  <div className="border-b border-[#151d224d] mx-4" />
                </div>
                <div className="space-y-12">
                  <p>Hormat Kami</p>
                  <p className="font-black">UD Adil Brothers</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top App Bar */}
      <header className="fixed top-0 w-full z-50 bg-primary text-white border-b border-primary/20 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2 sm:gap-3">
          <img 
            src={LOGO_URL} 
            alt="Logo" 
            className="h-6 sm:h-8 w-auto object-contain bg-primary p-0.5 rounded-sm mix-blend-screen"
            referrerPolicy="no-referrer"
          />
          <h1 className="font-display font-extrabold text-sm sm:text-lg text-white tracking-tight truncate max-w-[100px] sm:max-w-none">
            Adil Brothers
          </h1>
        </div>
        <div className="flex gap-1.5 sm:gap-2">
          {activeNav === 'editor' && (
            <>
            <button 
              onClick={handleSave}
              className="bg-white/10 sm:bg-white/20 text-white px-3 sm:px-5 py-1.5 sm:py-2 rounded-full font-bold text-[10px] sm:text-xs hover:bg-white/30 active:scale-95 transition-all flex items-center gap-1.5 sm:gap-2 border border-white/20"
            >
              <Save size={12} className="sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">SIMPAN</span>
              <span className="sm:hidden">SAVE</span>
            </button>
            <button 
              onClick={handlePrint}
              className="bg-secondary text-white px-3 sm:px-5 py-1.5 sm:py-2 rounded-full font-bold text-[10px] sm:text-xs hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 sm:gap-2 shadow-sm"
            >
              <Printer size={12} className="sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">CETAK</span>
              <span className="sm:hidden">PRINT</span>
            </button>
            </>
          )}
        </div>
      </header>

      <main className="pt-24 px-4 max-w-xl mx-auto space-y-8">
        {(!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) && (
          <div className="bg-error/10 border border-error/20 p-4 rounded-xl text-error text-xs font-bold mb-4">
            Peringatan: Supabase URL atau Anon Key belum diatur. Silakan atur di panel Secrets.
          </div>
        )}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-sm font-bold text-on-surface-variant">Memuat data...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeNav === 'editor' ? (
            <motion.div
              key="editor"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              {/* Tab Navigation */}
              <div className="bg-surface-container p-1 rounded-xl flex gap-1 overflow-x-auto">
                {(['eceran', 'umkm', 'pakan'] as TabType[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "flex-1 min-w-[100px] py-2.5 rounded-lg text-[11px] sm:text-sm font-bold transition-all capitalize",
                      activeTab === tab 
                        ? "bg-primary text-white shadow-sm" 
                        : "text-on-surface-variant hover:bg-white/50"
                    )}
                  >
                    Penjualan {tab === 'umkm' ? 'UMKM' : tab}
                  </button>
                ))}
              </div>

              {/* Configuration Forms */}
              <section className="bg-surface-container-lowest rounded-2xl p-6 editorial-shadow border border-outline-variant/20">
                <div className="space-y-5">
                  {activeTab === 'eceran' && (
                    <div>
                      <label className="block text-[10px] font-bold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                        Nama Pembeli (Opsional)
                      </label>
                      <input 
                        type="text"
                        value={data.buyer}
                        onChange={(e) => setData({ ...data, buyer: e.target.value })}
                        placeholder="Contoh: Bpk. Slamet"
                        className="w-full bg-surface-container border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary-container transition-all"
                      />
                    </div>
                  )}

                  {activeTab === 'umkm' && (
                    <div>
                      <label className="block text-[10px] font-bold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                        Pilih Pembeli UMKM
                      </label>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <select 
                            value={data.buyer}
                            onChange={(e) => setData({ ...data, buyer: e.target.value })}
                            className="flex-grow bg-surface-container border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary-container transition-all"
                          >
                            <option value="">Pilih Pembeli</option>
                            {umkmBuyers.map(buyer => (
                              <option key={buyer.id} value={buyer.name}>{buyer.name}</option>
                            ))}
                          </select>
                          <button 
                            onClick={handleAddBuyer}
                            className="bg-primary-container text-primary p-3 rounded-lg flex items-center justify-center active:scale-95 transition-all"
                            title="Tambah Pembeli"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                        {data.buyer && umkmBuyers.some(b => b.name === data.buyer) && (
                          <div className="flex justify-end">
                            <button 
                              onClick={() => handleDeleteBuyer(data.buyer)}
                              className="text-[10px] font-bold text-error flex items-center gap-1 hover:underline"
                            >
                              <Trash2 size={12} />
                              Hapus pembeli terpilih
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'pakan' && (
                    <div>
                      <label className="block text-[10px] font-bold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                        Jenis Pakan
                      </label>
                      <select 
                        value={data.type}
                        onChange={(e) => setData({ ...data, type: e.target.value })}
                        className="w-full bg-surface-container border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary-container transition-all"
                      >
                        <option value="Konsentrat">Konsentrat</option>
                        <option value="Bekatul">Bekatul</option>
                        <option value="Ampas Tahu">Ampas Tahu</option>
                        <option value="Polard">Polard</option>
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                        Tanggal
                      </label>
                      <input 
                        type="date"
                        value={data.date}
                        onChange={(e) => setData({ ...data, date: e.target.value })}
                        className="w-full bg-surface-container border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary-container transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                        Waktu
                      </label>
                      <input 
                        type="time"
                        value={data.time}
                        onChange={(e) => setData({ ...data, time: e.target.value })}
                        className="w-full bg-surface-container border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary-container transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                        Jumlah ({activeTab === 'pakan' ? 'kg/sak' : 'L'})
                      </label>
                      <input 
                        type="number"
                        value={data.qty}
                        onChange={(e) => setData({ ...data, qty: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-surface-container border-none rounded-lg py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-primary-container transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                        Harga/Satuan (Rp)
                      </label>
                      <input 
                        type="number"
                        value={data.price}
                        onChange={(e) => setData({ ...data, price: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-surface-container border-none rounded-lg py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-primary-container transition-all"
                      />
                    </div>
                  </div>

                  {activeTab === 'umkm' && (
                    <div className="space-y-4 pt-2 border-t border-outline-variant/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            id="shipping-toggle"
                            checked={data.shipping > 0}
                            onChange={(e) => setData({ ...data, shipping: e.target.checked ? 15000 : 0 })}
                            className="rounded text-primary focus:ring-primary"
                          />
                          <label htmlFor="shipping-toggle" className="text-xs font-bold text-on-surface">
                            Ongkos Kirim
                          </label>
                        </div>
                        {data.shipping > 0 && (
                          <input 
                            type="number"
                            value={data.shipping}
                            onChange={(e) => setData({ ...data, shipping: parseFloat(e.target.value) || 0 })}
                            className="w-32 bg-surface-container border-none rounded-lg py-2 px-3 text-sm font-bold"
                          />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            id="debt-toggle"
                            checked={data.debt > 0}
                            onChange={(e) => setData({ ...data, debt: e.target.checked ? 50000 : 0 })}
                            className="rounded text-primary focus:ring-primary"
                          />
                          <label htmlFor="debt-toggle" className="text-xs font-bold text-on-surface">
                            Piutang Sebelumnya
                          </label>
                        </div>
                        {data.debt > 0 && (
                          <input 
                            type="number"
                            value={data.debt}
                            onChange={(e) => setData({ ...data, debt: parseFloat(e.target.value) || 0 })}
                            className="w-32 bg-surface-container border-none rounded-lg py-2 px-3 text-sm font-bold"
                          />
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                      Catatan
                    </label>
                    <textarea 
                      value={data.notes}
                      onChange={(e) => setData({ ...data, notes: e.target.value })}
                      rows={2}
                      className="w-full bg-surface-container border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary-container transition-all"
                    />
                  </div>
                </div>
              </section>

              {/* Invoice Preview Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-display font-bold text-sm text-primary">
                    Pratinjau Invoice (A5)
                  </h3>
                  <span className="text-[10px] font-bold text-on-surface-variant">
                    {invNumber}
                  </span>
                </div>

                <div 
                  id="invoice-preview"
                  className="invoice-a5-preview bg-white editorial-shadow rounded-lg p-6 sm:p-8 flex flex-col text-on-surface overflow-hidden border border-outline-variant/10"
                >
                  {/* Header */}
                  <div className="flex justify-between items-stretch mb-6 bg-primary text-white -mx-6 -mt-6 p-6 rounded-t-lg">
                    <div className="flex items-center gap-3">
                      <img 
                        src={LOGO_URL} 
                        alt="Logo" 
                        className="h-10 w-auto object-contain bg-primary p-1 rounded-sm mix-blend-screen"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <h4 className="font-display font-black text-sm text-white uppercase leading-tight">
                          UD Adil Brothers
                        </h4>
                        <p className="text-[8px] font-bold text-primary-container italic">
                          Supplier Susu Segar
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col justify-center">
                      <h5 className="font-display font-black text-lg text-white tracking-tighter leading-none">
                        INVOICE
                      </h5>
                      <p className="text-[8px] font-bold text-[#ffffffcc] mt-1">
                        #{invNumber}
                      </p>
                    </div>
                  </div>

                  {/* Transaction Info */}
                  <div className="grid grid-cols-2 gap-4 mb-6 pt-4 border-t border-dashed border-[#bfc8cd66]">
                    <div className="space-y-1">
                      <p className="text-[7px] font-bold text-on-surface-variant uppercase tracking-widest">
                        DITAGIHKAN KEPADA
                      </p>
                      <p className="text-[10px] font-black text-on-surface leading-tight">
                        {data.buyer || (activeTab === 'eceran' ? 'Umum / Eceran' : activeTab === 'pakan' ? 'Pembelian Pakan' : 'Pilih Pembeli')}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-[7px] font-bold text-on-surface-variant uppercase tracking-widest">
                        TANGGAL TRANSAKSI
                      </p>
                      <p className="text-[9px] font-bold text-on-surface">
                        {formatDateIndo(data.date)} | {data.time} WIB
                      </p>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="flex-grow">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-[#0c678033]">
                          <th className="py-2 text-[8px] font-bold text-on-surface-variant uppercase">No</th>
                          <th className="py-2 text-[8px] font-bold text-on-surface-variant uppercase">Keterangan</th>
                          <th className="py-2 text-[8px] font-bold text-on-surface-variant uppercase text-center">
                            Qty ({activeTab === 'pakan' ? 'U' : 'L'})
                          </th>
                          <th className="py-2 text-[8px] font-bold text-on-surface-variant uppercase text-right">
                            Harga/{activeTab === 'pakan' ? 'U' : 'L'}
                          </th>
                          <th className="py-2 text-[8px] font-bold text-on-surface-variant uppercase text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="text-[9px]">
                        <tr className="border-b border-[#bfc8cd1a]">
                          <td className="py-3">1</td>
                          <td className="py-3 font-bold">
                            {activeTab === 'pakan' ? `Pakan: ${data.type}` : 'Susu Sapi Segar'}
                          </td>
                          <td className="py-3 text-center">{data.qty}</td>
                          <td className="py-3 text-right">{formatRupiah(data.price)}</td>
                          <td className="py-3 text-right font-black">{formatRupiah(subtotal)}</td>
                        </tr>
                        {data.shipping > 0 && (
                          <tr className="border-b border-[#bfc8cd1a]">
                            <td className="py-3">2</td>
                            <td className="py-3 font-bold">Ongkos Kirim</td>
                            <td className="py-3 text-center">-</td>
                            <td className="py-3 text-right">-</td>
                            <td className="py-3 text-right font-black">{formatRupiah(data.shipping)}</td>
                          </tr>
                        )}
                        {data.debt > 0 && (
                          <tr className="border-b border-[#bfc8cd1a]">
                            <td className="py-3">{data.shipping > 0 ? 3 : 2}</td>
                            <td className="py-3 font-bold">Piutang Sebelumnya</td>
                            <td className="py-3 text-center">-</td>
                            <td className="py-3 text-right">-</td>
                            <td className="py-3 text-right font-black">{formatRupiah(data.debt)}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals */}
                  <div className="mt-4 pt-4 border-t-2 border-[#87ceeb33]">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[8px] text-on-surface-variant font-medium">
                        <p>Subtotal Produk</p>
                        <p>{formatRupiah(subtotal)}</p>
                      </div>
                      {data.shipping > 0 && (
                        <div className="flex justify-between items-center text-[8px] text-on-surface-variant font-medium">
                          <p>Ongkos Kirim</p>
                          <p>{formatRupiah(data.shipping)}</p>
                        </div>
                      )}
                      {data.debt > 0 && (
                        <div className="flex justify-between items-center text-[8px] text-on-surface-variant font-medium">
                          <p>Piutang Sebelumnya</p>
                          <p>{formatRupiah(data.debt)}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-center mt-3 py-2.5 bg-[#0c67800d] px-3 rounded-md">
                      <p className="text-[9px] font-black text-[#0c6780] uppercase tracking-widest">
                        TOTAL KESELURUHAN
                      </p>
                      <p className="text-xs font-black text-[#0c6780]">
                        {formatRupiah(total)}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-8 pt-4 border-t border-[#bfc8cd33]">
                    <p className="text-center text-[8px] italic text-on-surface-variant mb-6">
                      {data.notes ? `"${data.notes}"` : `"Terima kasih atas kepercayaan Anda memilih produk kami."`}
                    </p>
                    <div className="grid grid-cols-2 gap-12 text-center text-[9px] font-bold">
                      <div className="space-y-12">
                        <p>Penerima</p>
                        <div className="border-b border-[#151d224d] mx-4" />
                      </div>
                      <div className="space-y-12">
                        <p>Hormat Kami</p>
                        <p className="font-black">UD Adil Brothers</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display font-extrabold text-xl text-primary">Riwayat Invoice</h2>
                <button 
                  onClick={handleNew}
                  className="bg-primary-container text-primary p-2 rounded-full active:scale-95 transition-all"
                >
                  <Plus size={20} />
                </button>
              </div>

              {invoices.length === 0 ? (
                <div className="bg-surface-container rounded-2xl p-12 text-center space-y-4">
                  <ReceiptText size={48} className="mx-auto text-on-surface-variant/20" />
                  <p className="text-on-surface-variant font-medium">Belum ada riwayat invoice.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invoices.map((inv) => (
                    <div 
                      key={inv.id}
                      className="bg-surface-container-lowest rounded-2xl p-5 editorial-shadow border border-outline-variant/20 flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1 flex-grow">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded uppercase tracking-wider">
                            {inv.category}
                          </span>
                          <span className="text-[10px] font-bold text-on-surface-variant">
                            {inv.invNumber}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-on-surface">
                          {inv.buyer || (inv.category === 'eceran' ? 'Umum / Eceran' : 'Pembelian Pakan')}
                        </h4>
                        <p className="text-[10px] text-on-surface-variant">
                          {formatDateIndo(inv.date)} • {inv.time}
                        </p>
                        <p className="text-xs font-black text-primary mt-1">
                          {formatRupiah(inv.qty * inv.price + inv.shipping + inv.debt)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleDownload(inv)}
                          disabled={isDownloading}
                          className="p-2.5 rounded-xl bg-surface-container text-secondary hover:bg-secondary/10 transition-all disabled:opacity-50"
                          title="Unduh PDF"
                        >
                          <Download size={18} />
                        </button>
                        <button 
                          onClick={() => handleEdit(inv)}
                          className="p-2.5 rounded-xl bg-surface-container text-primary hover:bg-primary/10 transition-all"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(inv.id)}
                          className="p-2.5 rounded-xl bg-surface-container text-error hover:bg-error/10 transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isAddBuyerModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddBuyerModalOpen(false)}
              className="absolute inset-0 bg-surface/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-surface-container rounded-3xl p-6 shadow-2xl border border-on-surface-variant/10"
            >
              <h3 className="text-lg font-bold text-on-surface mb-4">Tambah Pembeli UMKM</h3>
              <input 
                autoFocus
                type="text"
                value={newBuyerName}
                onChange={(e) => setNewBuyerName(e.target.value)}
                placeholder="Nama Pembeli"
                className="w-full bg-surface border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary-container mb-6"
                onKeyDown={(e) => e.key === 'Enter' && confirmAddBuyer()}
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsAddBuyerModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-sm text-on-surface-variant bg-surface active:scale-95 transition-all"
                >
                  Batal
                </button>
                <button 
                  onClick={confirmAddBuyer}
                  disabled={isAddingBuyer || !newBuyerName.trim()}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-sm text-primary bg-primary-container active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isAddingBuyer ? <Loader2 size={16} className="animate-spin" /> : 'Simpan'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isDeleteBuyerModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteBuyerModalOpen(false)}
              className="absolute inset-0 bg-surface/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-surface-container rounded-3xl p-6 shadow-2xl border border-on-surface-variant/10"
            >
              <h3 className="text-lg font-bold text-on-surface mb-2">Hapus Pembeli?</h3>
              <p className="text-sm text-on-surface-variant mb-6">
                Apakah Anda yakin ingin menghapus pembeli <span className="font-bold text-on-surface">"{buyerToDelete}"</span>?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDeleteBuyerModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-sm text-on-surface-variant bg-surface active:scale-95 transition-all"
                >
                  Batal
                </button>
                <button 
                  onClick={confirmDeleteBuyer}
                  disabled={isDeletingBuyer}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-sm text-error bg-error/10 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeletingBuyer ? <Loader2 size={16} className="animate-spin" /> : 'Hapus'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isDeleteInvoiceModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteInvoiceModalOpen(false)}
              className="absolute inset-0 bg-surface/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-surface-container rounded-3xl p-6 shadow-2xl border border-on-surface-variant/10"
            >
              <h3 className="text-lg font-bold text-on-surface mb-2">Hapus Invoice?</h3>
              <p className="text-sm text-on-surface-variant mb-6">
                Data invoice yang dihapus tidak dapat dikembalikan.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDeleteInvoiceModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-sm text-on-surface-variant bg-surface active:scale-95 transition-all"
                >
                  Batal
                </button>
                <button 
                  onClick={confirmDeleteInvoice}
                  disabled={isDeletingInvoice}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-sm text-error bg-error/10 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeletingInvoice ? <Loader2 size={16} className="animate-spin" /> : 'Hapus'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-center items-center px-4 pb-6 pt-3 bg-surface/90 backdrop-blur-xl z-50 rounded-t-3xl shadow-[0_-4px_24px_rgba(21,29,34,0.06)]">
        <div className="flex gap-8">
          <div 
            onClick={() => setActiveNav('editor')}
            className={cn(
              "flex flex-col items-center justify-center rounded-full px-8 py-2 active:scale-95 transition-all cursor-pointer",
              activeNav === 'editor' ? "bg-primary-container text-primary" : "text-on-surface-variant/40"
            )}
          >
            <ReceiptText size={24} />
            <span className="font-sans font-bold text-[9px] tracking-wider uppercase mt-1">Invoice</span>
          </div>
          <div 
            onClick={() => setActiveNav('history')}
            className={cn(
              "flex flex-col items-center justify-center rounded-full px-8 py-2 active:scale-95 transition-all cursor-pointer",
              activeNav === 'history' ? "bg-primary-container text-primary" : "text-on-surface-variant/40"
            )}
          >
            <History size={24} />
            <span className="font-sans font-bold text-[9px] tracking-wider uppercase mt-1">Riwayat</span>
          </div>
        </div>
      </nav>
    </div>
  );
}
