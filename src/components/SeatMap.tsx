import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getSeats } from '../services/cgvApi';

interface Seat {
  id: string;
  row_name: string;
  number: number;
  is_seat: boolean;
  is_available: boolean;
  grade: string;
  color: string;
  price: number;
}

interface SeatMapProps {
  scheduleId: string;
  scheduleTime: string;
  schedulePrice: number;
  cinemaName: string;
  locationName: string;
  movieName: string;
  selectedDate: string;
  auditoriumName: string;
  onClose: () => void;
}

export default function SeatMap({
  scheduleId,
  scheduleTime,
  schedulePrice,
  cinemaName,
  locationName,
  movieName,
  selectedDate,
  auditoriumName,
  onClose
}: SeatMapProps) {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [backupSeats, setBackupSeats] = useState('');

  useEffect(() => {
    loadSeats();
  }, [scheduleId]);

  const loadSeats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSeats(scheduleId);
      console.log('[SeatMap] API Response:', data);
      console.log('[SeatMap] Rows count:', data?.rows?.length);

      if (data && data.rows && Array.isArray(data.rows)) {
        const allSeats: Seat[] = [];
        data.rows.forEach((row: any, rowIndex: number) => {
          console.log(`[SeatMap] Row ${rowIndex}:`, row);
          const rowName = row.row_name || row.name || row.label || String.fromCharCode(65 + rowIndex);
          console.log(`[SeatMap] Row ${rowIndex} name: "${rowName}"`);

          if (Array.isArray(row.seats)) {
            row.seats.forEach((seat: any) => {
              allSeats.push({
                id: seat.id || seat.seat_id || `${rowName}-${seat.number}`,
                row_name: rowName,
                number: seat.number || 0,
                is_seat: seat.is_seat !== false,
                is_available: seat.is_available === true,
                grade: seat.grade || seat.type || 'Regular',
                color: seat.color || '#3b82f6',
                price: seat.price || schedulePrice
              });
            });
          }
        });
        console.log('[SeatMap] Parsed seats:', allSeats.length);
        console.log('[SeatMap] Sample seats:', allSeats.slice(0, 5));
        setSeats(allSeats);
      } else {
        console.error('[SeatMap] Invalid data structure:', data);
        setError('Data kursi tidak tersedia');
      }
    } catch (err) {
      console.error('[SeatMap] Error loading seats:', err);
      setError('Gagal memuat data kursi');
    } finally {
      setLoading(false);
    }
  };

  const toggleSeat = (seatId: string) => {
    const seat = seats.find(s => s.id === seatId);
    if (!seat || !seat.is_available) return;

    const newSelected = new Set(selectedSeats);
    if (newSelected.has(seatId)) {
      newSelected.delete(seatId);
    } else {
      newSelected.add(seatId);
    }
    setSelectedSeats(newSelected);
  };

  const groupSeatsByRow = () => {
    const rowMap = new Map<string, Seat[]>();
    let maxSeatsPerRow = 0;

    console.log('[SeatMap] Grouping', seats.length, 'seats');

    seats.forEach(seat => {
      const rowName = seat.row_name || 'X';
      if (!rowMap.has(rowName)) {
        rowMap.set(rowName, []);
      }
      rowMap.get(rowName)!.push(seat);
    });

    console.log('[SeatMap] Row map keys:', Array.from(rowMap.keys()));
    console.log('[SeatMap] Row map size:', rowMap.size);

    const sortedRows = Array.from(rowMap.entries()).sort((a, b) => {
      return a[0].localeCompare(b[0]);
    });

    const result = sortedRows.map(([rowName, rowSeats]) => {
      const sorted = [...rowSeats].sort((a, b) => a.number - b.number);
      maxSeatsPerRow = Math.max(maxSeatsPerRow, sorted.length);
      console.log(`[SeatMap] Row ${rowName}: ${sorted.length} seats`);
      return { rowName, seats: sorted };
    });

    return { rows: result, maxSeats: maxSeatsPerRow };
  };

  const getSeatColor = (seat: Seat) => {
    if (!seat.is_seat) return 'transparent';
    if (!seat.is_available) return '#4a5568';
    if (selectedSeats.has(seat.id)) return '#ef4444';

    if (seat.grade?.toLowerCase().includes('sweetbox')) {
      return '#ec4899';
    } else if (seat.grade?.toLowerCase().includes('satin')) {
      return '#d97706';
    }
    return '#d97706';
  };

  const calculateDiscount = (ticketCount: number) => {
    if (ticketCount < 1) return { normal: 0, discount: 0, saved: 0 };

    const normalTotal = schedulePrice * ticketCount;

    const timeStr = scheduleTime.replace(':', '.');
    const [hours, minutes] = timeStr.split('.').map(Number);
    const timeInMinutes = hours * 60 + minutes;

    const discountRate = timeInMinutes < 960 ? 0.25 : 0.15;
    const discountTotal = Math.round(normalTotal * (1 - discountRate));
    const saved = normalTotal - discountTotal;

    return {
      normal: normalTotal,
      discount: discountTotal,
      saved: saved
    };
  };

  const getTotalPrice = () => {
    return Array.from(selectedSeats).reduce((total, seatId) => {
      const seat = seats.find(s => s.id === seatId);
      return total + (seat?.price || schedulePrice);
    }, 0);
  };

  const getSelectedSeatsInfo = () => {
    return Array.from(selectedSeats).map(seatId => {
      const seat = seats.find(s => s.id === seatId);
      return seat ? {
        label: `${seat.row_name}${seat.number}`,
        grade: seat.grade,
        price: seat.price
      } : null;
    }).filter(Boolean);
  };

  const formatRupiah = (num: number) => {
    return 'Rp' + num.toLocaleString('id-ID');
  };

  const formatDate = (dateStr: string) => {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${day}/${month}/${year}`;
  };

  const handleSendToWhatsApp = () => {
    const selectedSeatsStr = getSelectedSeatsInfo().map(s => s?.label).join(', ');
    const ticketCount = selectedSeats.size;
    const pricing = calculateDiscount(ticketCount);

    const message = `*CGV CINEMAS*

*Nama Bioskop:* ${cinemaName}
*Nama Daerah/Lokasi:* ${locationName}
*Tanggal Film:* ${formatDate(selectedDate)}
*Nama Film:* ${movieName}
*Jam Film:* ${scheduleTime}
*Studio:* ${auditoriumName}
*Jumlah Tiket:* ${ticketCount}
*Seat Utama:* ${selectedSeatsStr}
*Seat Cadangan:* ${backupSeats || '-'}
*Harga 1 Tiket Normal:* ${formatRupiah(schedulePrice)}
*Total Harga Normal:* ${formatRupiah(pricing.normal)}
*Total Harga Promo:* ${formatRupiah(pricing.discount)}
*Hemat:* ${formatRupiah(pricing.saved)}`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const pricing = calculateDiscount(selectedSeats.size);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="bg-gray-900 rounded-2xl p-8 max-w-6xl w-full mx-4 max-h-[90vh] overflow-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-300">Memuat peta kursi...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showOrderForm) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-auto">
          <div className="p-6 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-gray-900 z-10">
            <h2 className="text-xl font-bold text-white">Form Pemesanan</h2>
            <button
              onClick={() => setShowOrderForm(false)}
              className="p-2 hover:bg-gray-800 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Bioskop:</span>
                <span className="text-white font-medium">{cinemaName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Lokasi:</span>
                <span className="text-white font-medium">{locationName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Film:</span>
                <span className="text-white font-medium">{movieName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Tanggal:</span>
                <span className="text-white font-medium">{formatDate(selectedDate)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Jam:</span>
                <span className="text-white font-medium">{scheduleTime}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Studio:</span>
                <span className="text-white font-medium">{auditoriumName}</span>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Jumlah Tiket:</span>
                <span className="text-white font-medium">{selectedSeats.size}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Seat Utama:</span>
                <span className="text-white font-medium">
                  {getSelectedSeatsInfo().map(s => s?.label).join(', ')}
                </span>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Seat Cadangan (opsional):
                </label>
                <input
                  type="text"
                  value={backupSeats}
                  onChange={(e) => setBackupSeats(e.target.value)}
                  placeholder="Contoh: A5, A6"
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-blue-200">Harga Normal:</span>
                <span className="text-white font-medium line-through">{formatRupiah(pricing.normal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-200 font-medium">Harga Promo:</span>
                <span className="text-white text-xl font-bold">{formatRupiah(pricing.discount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-green-300">Hemat:</span>
                <span className="text-green-300 font-medium">{formatRupiah(pricing.saved)}</span>
              </div>
            </div>

            <button
              onClick={handleSendToWhatsApp}
              className="w-full py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg"
            >
              Kirim ke WhatsApp
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { rows: rowsData, maxSeats } = groupSeatsByRow();
  const gridWidth = Math.min(maxSeats * 32, 800);

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-gray-900">
          <div>
            <h2 className="text-lg font-bold text-white">Pilih Kursi</h2>
            <p className="text-xs text-gray-400">{movieName} - {scheduleTime}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-[#1a1d29]">
          <div className="w-full max-w-6xl mx-auto">
            <div className="mb-8">
              <div className="relative bg-gradient-to-b from-gray-300 to-gray-500 h-1.5 rounded-full shadow-lg mx-auto" style={{maxWidth: '80%'}}></div>
              <p className="text-center text-xs text-gray-400 font-semibold mt-3 tracking-[0.4em] uppercase">Screen</p>
            </div>

            <div className="overflow-x-auto pb-6">
              <div className="min-w-max mx-auto" style={{width: 'fit-content'}}>
                <div className="space-y-2">
                  {rowsData.map(({ rowName, seats: rowSeats }) => {
                    const hasSeats = rowSeats.some(s => s.is_seat);
                    if (!hasSeats) return null;

                    return (
                      <div key={rowName} className="flex items-center gap-3">
                        <div className="w-8 text-center font-bold text-white text-sm bg-gray-700 rounded py-1">
                          {rowName}
                        </div>
                        <div className="flex gap-1">
                          {rowSeats.map(seat => {
                            if (!seat.is_seat) {
                              return <div key={seat.id} className="w-10 h-10" />;
                            }

                            const isSelected = selectedSeats.has(seat.id);
                            const seatColor = getSeatColor(seat);
                            const seatLabel = `${rowName}${seat.number}`;

                            return (
                              <button
                                key={seat.id}
                                onClick={() => toggleSeat(seat.id)}
                                disabled={!seat.is_available}
                                className="relative w-10 h-10 rounded transition-all duration-150 disabled:cursor-not-allowed flex items-center justify-center hover:scale-105"
                                style={{
                                  backgroundColor: seatColor,
                                  border: isSelected ? '3px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                                  transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                                  boxShadow: isSelected ? '0 0 15px rgba(239, 68, 68, 0.6)' : 'none'
                                }}
                                title={`${seatLabel} - ${seat.grade} - ${formatRupiah(seat.price)}`}
                              >
                                <span className="text-white text-xs font-bold leading-none">
                                  {seat.number}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-5 mt-4">
              <div className="flex items-center justify-center gap-6 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-[#d97706] rounded"></div>
                  <span className="text-gray-300">Tersedia</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-[#4a5568] rounded"></div>
                  <span className="text-gray-300">Terisi</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-[#ec4899] rounded"></div>
                  <span className="text-gray-300">Sweetbox</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {selectedSeats.size > 0 && (
          <div className="border-t border-gray-700 p-5 bg-[#1e2230]">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-300 mb-2">
                    {selectedSeats.size} Kursi: <span className="font-semibold text-white">{getSelectedSeatsInfo().map(s => s?.label).join(', ')}</span>
                  </p>
                  {pricing.saved > 0 ? (
                    <div className="flex items-baseline gap-3">
                      <p className="text-sm text-gray-400">
                        Normal: <span className="line-through">{formatRupiah(pricing.normal)}</span>
                      </p>
                      <p className="text-xl font-bold text-green-400">
                        {formatRupiah(pricing.discount)}
                      </p>
                      <span className="text-xs text-green-400">(Hemat {formatRupiah(pricing.saved)})</span>
                    </div>
                  ) : (
                    <p className="text-xl font-bold text-white">
                      {formatRupiah(pricing.normal)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowOrderForm(true)}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors shadow-lg ml-4"
                >
                  Lanjutkan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
