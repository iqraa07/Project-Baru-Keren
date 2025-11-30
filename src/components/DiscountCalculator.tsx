import { useState } from 'react';
import { Calculator, Tag, Ticket } from 'lucide-react';

export default function DiscountCalculator() {
  const [priceInput, setPriceInput] = useState('');
  const [ticketCount, setTicketCount] = useState(1);
  const [result, setResult] = useState<{
    normal: number;
    promo: number;
    saved: number;
  } | null>(null);

  const parsePrice = (raw: string): number => {
    if (!raw) return 0;
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
    if (isNaN(n) || n <= 0) return 0;
    return n;
  };

  const formatRupiah = (num: number) => {
    return 'Rp' + num.toLocaleString('id-ID');
  };

  const customMap: { [key: number]: number } = {
    35000: 60000,
    40000: 65000,
    45000: 70000,
    50000: 75000,
    55000: 80000,
    60000: 85000,
    65000: 90000,
    70000: 100000,
    75000: 105000,
    80000: 115000,
    85000: 120000,
    90000: 130000,
    95000: 135000,
    100000: 145000,
    105000: 150000,
    110000: 155000,
    115000: 165000,
    120000: 170000,
  };

  const calculateDiscount = () => {
    const harga1 = parsePrice(priceInput);
    if (harga1 === 0 || ticketCount === 0) {
      return;
    }

    const totalNormal = harga1 * ticketCount;
    const pasanganTiket = Math.floor(ticketCount / 2);
    const sisaTiket = ticketCount % 2;

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

    setResult({
      normal: totalNormal,
      promo: totalPromo,
      saved: totalNormal - totalPromo
    });
  };

  const handlePriceChange = (value: string) => {
    setPriceInput(value);
    setResult(null);
  };

  const handleTicketCountChange = (count: number) => {
    if (count >= 1 && count <= 20) {
      setTicketCount(count);
      setResult(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-6">
        <div className="flex items-center gap-3">
          <Calculator className="w-8 h-8 text-emerald-100" />
          <div>
            <h1 className="text-3xl font-bold text-white">Kalkulator Diskon</h1>
            <p className="text-emerald-100 text-sm mt-1">
              Hitung hemat promo beli 2 dapat 50% untuk tiket kedua
            </p>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6">
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-4">
          <p className="text-sm text-emerald-900">
            <strong>Cara Kerja:</strong> Masukkan harga 1 tiket normal → Pilih jumlah tiket → Klik Hitung untuk melihat total hemat
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-600" />
            Harga 1 Tiket Normal
          </label>
          <input
            type="text"
            value={priceInput}
            onChange={(e) => handlePriceChange(e.target.value)}
            placeholder="Contoh: 65000 atau 65k atau Rp65.000"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
          <p className="text-xs text-gray-500 mt-1">
            Format: 65000, 65.000, 65k, 65rb, Rp65.000
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Ticket className="w-4 h-4 text-emerald-600" />
            Jumlah Tiket
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleTicketCountChange(ticketCount - 1)}
              className="w-12 h-12 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg font-bold text-xl transition"
              disabled={ticketCount <= 1}
            >
              -
            </button>
            <input
              type="number"
              value={ticketCount}
              onChange={(e) => handleTicketCountChange(parseInt(e.target.value) || 1)}
              min="1"
              max="20"
              className="w-20 text-center px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 font-bold text-lg"
            />
            <button
              onClick={() => handleTicketCountChange(ticketCount + 1)}
              className="w-12 h-12 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg font-bold text-xl transition"
              disabled={ticketCount >= 20}
            >
              +
            </button>
          </div>
        </div>

        <button
          onClick={calculateDiscount}
          disabled={!priceInput || parsePrice(priceInput) === 0}
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Calculator className="w-5 h-5" />
          Hitung Diskon
        </button>

        {result && (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-emerald-900 mb-4">Hasil Perhitungan:</h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-emerald-200">
                <span className="text-gray-700">Harga Normal ({ticketCount} tiket)</span>
                <span className="font-semibold text-gray-900 line-through">{formatRupiah(result.normal)}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-emerald-200">
                <span className="text-gray-700">Harga Promo</span>
                <span className="font-bold text-emerald-700 text-xl">{formatRupiah(result.promo)}</span>
              </div>

              {result.saved > 0 && (
                <div className="flex justify-between items-center bg-emerald-100 p-3 rounded-lg">
                  <span className="font-semibold text-emerald-900">Total Hemat</span>
                  <span className="font-bold text-emerald-600 text-xl">{formatRupiah(result.saved)}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-emerald-200">
              <p className="text-xs text-gray-600">
                <strong>Detail:</strong> {ticketCount === 1
                  ? 'Diskon Rp5.000 untuk 1 tiket'
                  : `Beli 2 tiket dapat harga promo (estimasi 74.5% dari harga normal)`
                }
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
