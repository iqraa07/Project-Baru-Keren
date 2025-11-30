import { useState, useEffect } from 'react';
import { Send, ChevronLeft, ChevronRight, Ticket, Calculator } from 'lucide-react';
import PromoCalculator from './components/PromoCalculator';
import DiscountCalculator from './components/DiscountCalculator';
import Footer from './components/Footer';

const customMap: Record<number, number> = {
  25000: 36000,
  27000: 39000,
  28000: 40000,
  29000: 44000,
  30000: 46000,
  32000: 47500,
  33000: 49000,
  35000: 53000,
  36000: 54000,
  37000: 55000,
  38000: 56000,
  40000: 58000,
  41000: 60000,
  42000: 61000,
  43000: 62000,
  45000: 65000,
  47000: 70000,
  48000: 74000,
  50000: 76000,
  51000: 78000,
  52000: 80000,
  55000: 83000
};

function parseHarga(raw: string): number | null {
  if (!raw) return null;
  let s = raw.toLowerCase().trim();

  s = s.replace(/\s+/g, "");
  s = s.replace(/^rp/, "");
  s = s.replace(/ribu/g, "rb");
  s = s.replace(/rb$/, "000");

  if (s.endsWith("k")) {
    s = s.slice(0, -1) + "000";
  }

  s = s.replace(/[.,]/g, "");

  const n = parseInt(s, 10);
  if (isNaN(n) || n <= 0) return null;
  return n;
}

function formatRupiah(num: number): string {
  return "Rp " + num.toLocaleString("id-ID");
}

function getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentTime(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatDateForDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

interface FormData {
  namaBioskop: string;
  lokasiDaerah: string;
  tanggalFilm: string;
  namaFilm: string;
  jamFilm: string;
  jumlahTiket: number;
  seatUtama: string;
  seatCadangan: string;
  hargaTiket: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<'order' | 'calculator' | 'discount'>('order');
  const [showGuide, setShowGuide] = useState(false);
  const [promoResult, setPromoResult] = useState<string>('');

  const [formData, setFormData] = useState<FormData>({
    namaBioskop: '',
    lokasiDaerah: '',
    tanggalFilm: getTodayDate(),
    namaFilm: '',
    jamFilm: getCurrentTime(),
    jumlahTiket: 2,
    seatUtama: '',
    seatCadangan: '',
    hargaTiket: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleJumlahTiketChange = (value: number) => {
    if (value >= 1) {
      setFormData(prev => ({ ...prev, jumlahTiket: value }));
    }
  };

  const handleDateChange = (days: number) => {
    const currentDate = new Date(formData.tanggalFilm);
    currentDate.setDate(currentDate.getDate() + days);
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    setFormData(prev => ({ ...prev, tanggalFilm: `${year}-${month}-${day}` }));
  };

  useEffect(() => {
    if (formData.hargaTiket) {
      const harga1 = parseHarga(formData.hargaTiket);
      if (harga1) {
        let promo: number;

        const pasanganTiket = Math.floor(formData.jumlahTiket / 2);
        const sisaTiket = formData.jumlahTiket % 2;

        let totalPromo = 0;

        for (let i = 0; i < pasanganTiket; i++) {
          if (customMap[harga1]) {
            totalPromo += customMap[harga1];
          } else {
            const normal2 = harga1 * 2;
            const est = normal2 * 0.745;
            totalPromo += Math.round(est / 1000) * 1000;
          }
        }

        if (sisaTiket === 1) {
          totalPromo += (harga1 - 5000);
        }

        promo = totalPromo;
        setPromoResult(formatRupiah(promo));
      } else {
        setPromoResult('');
      }
    } else {
      setPromoResult('');
    }
  }, [formData.hargaTiket, formData.jumlahTiket]);

  const handleTimeChange = (minutes: number) => {
    if (!formData.jamFilm) {
      const newTime = '00:00';
      const [hours, mins] = newTime.split(':').map(Number);
      const totalMinutes = (hours * 60 + mins + minutes + 1440) % 1440;
      const newHours = Math.floor(totalMinutes / 60);
      const newMins = totalMinutes % 60;
      setFormData(prev => ({
        ...prev,
        jamFilm: `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`
      }));
    } else {
      const [hours, mins] = formData.jamFilm.split(':').map(Number);
      const totalMinutes = (hours * 60 + mins + minutes + 1440) % 1440;
      const newHours = Math.floor(totalMinutes / 60);
      const newMins = totalMinutes % 60;
      setFormData(prev => ({
        ...prev,
        jamFilm: `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`
      }));
    }
  };

  const handleSubmitPesan = () => {
    const requiredFields = ['namaBioskop', 'lokasiDaerah', 'tanggalFilm', 'namaFilm', 'jamFilm', 'seatUtama', 'seatCadangan', 'hargaTiket'];
    const emptyFields = requiredFields.filter(field => !formData[field as keyof FormData]);

    if (emptyFields.length > 0) {
      alert('Mohon lengkapi semua field yang wajib diisi (bertanda *)');
      return;
    }

    const jamFormatted = formData.jamFilm.replace(':', '.');

    const message = `*PESANAN TIKET CGV CINEMAS*

📍 *Bioskop:* ${formData.namaBioskop}
📌 *Lokasi:* ${formData.lokasiDaerah}
📅 *Tanggal:* ${formatDateForDisplay(formData.tanggalFilm)}
🎬 *Film:* ${formData.namaFilm}
🕐 *Jam:* ${jamFormatted}
🎫 *Jumlah Tiket:* ${formData.jumlahTiket}
💺 *Seat Utama:* ${formData.seatUtama}
💺 *Seat Cadangan:* ${formData.seatCadangan}
💰 *Harga 1 Tiket Normal:* ${formData.hargaTiket}
${promoResult ? `✨ *Harga Promo Total:* ${promoResult}` : ''}`;

    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://wa.me/6282296813933?text=${encodedMessage}`;

    window.open(waUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-3xl">

        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent mb-2">CGV CINEMAS</h1>
          <p className="text-sm text-gray-600">Kalkulator Promo CGV</p>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <button
            onClick={() => setActiveTab('order')}
            className={`py-3 px-4 font-semibold rounded-lg transition text-sm ${
              activeTab === 'order'
                ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
Pesan Tiket
          </button>
          <button
            onClick={() => setActiveTab('calculator')}
            className={`py-3 px-4 font-semibold rounded-lg transition text-sm ${
              activeTab === 'calculator'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
Cek Harga
          </button>
          <button
            onClick={() => setActiveTab('discount')}
            className={`py-3 px-4 font-semibold rounded-lg transition text-sm ${
              activeTab === 'discount'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
Diskon
          </button>
        </div>

        {activeTab === 'calculator' ? (
          <PromoCalculator />
        ) : activeTab === 'discount' ? (
          <DiscountCalculator />
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-red-100">
          <div className="bg-gradient-to-r from-red-600 to-orange-600 p-4 sm:p-5">
            <h2 className="text-white font-bold text-lg sm:text-xl">
              Formulir Pemesanan Tiket
            </h2>
          </div>
          <div className="p-5 sm:p-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="text-sm text-gray-700 space-y-2">
                <p className="font-semibold text-blue-900 mb-2">Panduan Pengisian:</p>
                <p>• Isi semua field yang bertanda (*)</p>
                <p>• Harga akan otomatis dihitung setelah input</p>
                <p>• Klik tombol kirim untuk memesan via WhatsApp</p>
              </div>
              <button
                onClick={() => setShowGuide(!showGuide)}
                className="text-blue-600 font-medium text-xs mt-2 hover:underline"
              >
                {showGuide ? 'Sembunyikan' : 'Lihat'} detail lengkap
              </button>
              {showGuide && (
                <div className="mt-3 text-sm text-gray-700 space-y-2">
                  <p><strong>1. Isi nama bioskop dengan benar</strong> (contoh: Panakkukang Square)</p>
                  <p><strong>2. Isi lokasi/daerah</strong> (contoh: Makassar)</p>
                  <p><strong>3. Pilih tanggal dengan tombol panah atau klik kalender</strong></p>
                  <p><strong>4. Isi nama film sesuai yang ada di CGV</strong> (contoh: AGAK LAEN, ZOOTOPIA)</p>
                  <p><strong>5. Jam format 24 jam WIB, geser dengan tombol panah</strong> (contoh: 16:00)</p>
                  <p><strong>6. Seat Utama dan Cadangan wajib diisi dengan benar</strong> (contoh: A12, A13)</p>
                  <p><strong>7. Harga otomatis hitung promo saat diketik</strong></p>
                  <p><strong>8. Default 2 tiket, ubah jika perlu (1 tiket diskon 5rb)</strong></p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nama Bioskop <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="namaBioskop"
                    value={formData.namaBioskop}
                    onChange={handleInputChange}
                    placeholder="Panakkukang Square"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Lokasi/Daerah <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="lokasiDaerah"
                    value={formData.lokasiDaerah}
                    onChange={handleInputChange}
                    placeholder="Makassar"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tanggal Film <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDateChange(-1)}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <input
                      type="date"
                      name="tanggalFilm"
                      value={formData.tanggalFilm}
                      onChange={handleInputChange}
                      className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => handleDateChange(1)}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Hari ini: {formatDateForDisplay(getTodayDate())}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Jam Film <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTimeChange(-30)}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <input
                      type="text"
                      name="jamFilm"
                      value={formData.jamFilm}
                      onChange={handleInputChange}
                      placeholder="16:00"
                      className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition text-sm text-center font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => handleTimeChange(30)}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Format 24 jam WIB - Jam sekarang: {getCurrentTime()}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nama Film <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="namaFilm"
                    value={formData.namaFilm}
                    onChange={handleInputChange}
                    placeholder="AGAK LAEN"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition text-sm uppercase"
                  />
                  <p className="mt-1 text-xs text-gray-500">Tulis sesuai judul film di CGV</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Jumlah Tiket <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleJumlahTiketChange(formData.jumlahTiket - 1)}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <input
                      type="number"
                      name="jumlahTiket"
                      value={formData.jumlahTiket}
                      onChange={(e) => handleJumlahTiketChange(parseInt(e.target.value) || 1)}
                      min="1"
                      className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition text-sm text-center"
                    />
                    <button
                      type="button"
                      onClick={() => handleJumlahTiketChange(formData.jumlahTiket + 1)}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.jumlahTiket === 1 ? 'Diskon 5rb untuk 1 tiket' : `Default 2 tiket (promo terbaik)`}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Harga 1 Tiket Normal <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="hargaTiket"
                    value={formData.hargaTiket}
                    onChange={handleInputChange}
                    placeholder="65k atau 65000"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition text-sm"
                  />
                  {promoResult && (
                    <div className="mt-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded-lg p-3">
                      <p className="text-sm font-bold text-green-700">
                        💰 Harga Promo: {promoResult}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Seat Utama <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="seatUtama"
                    value={formData.seatUtama}
                    onChange={handleInputChange}
                    placeholder="A12, A13"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Seat Cadangan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="seatCadangan"
                    value={formData.seatCadangan}
                    onChange={handleInputChange}
                    placeholder="B12, B13"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">Wajib diisi sebagai opsi cadangan</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleSubmitPesan}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg transition shadow-lg text-lg"
                >
                  Kirim ke WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
        )}

        <Footer />
      </div>
    </div>
  );
}

export default App;
