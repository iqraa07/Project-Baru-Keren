import { useState, useEffect } from 'react';
import { Search, Film, MapPin, Clock, DollarSign, Sparkles, X, Calendar, ChevronRight, AlertCircle } from 'lucide-react';
import { getCinemas, getMoviesByLocation, scanSchedulesNext10Days, getSeats, getTodayIndonesia, downloadDebugLogs, clearDebugLogs, setAuthToken} from '../services/cgvApi';
import SeatMap from './SeatMap';

interface Cinema {
  id: string;
  name: string;
  location_name: string;
  location_id: string;
  address: string;
}

interface Movie {
  id: string;
  name: string;
  title?: string;
  image_url?: string;
  poster?: string;
  status?: 'playing' | 'upcoming';
}

interface Schedule {
  schedule_id: string;
  start_time: string;
  end_time: string;
  auditorium_name: string;
  auditorium_type_name: string;
  price: number;
  remaining_seat_count?: number;
  total_seat_count?: number;
}

export default function PromoCalculator() {
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [schedulesByDate, setSchedulesByDate] = useState<Map<string, Schedule[]>>(new Map());
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const [searchCinema, setSearchCinema] = useState('');
  const [searchMovie, setSearchMovie] = useState('');
  const [selectedCinema, setSelectedCinema] = useState<Cinema | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  const [availableSeats, setAvailableSeats] = useState<number>(0);
  const [totalSeats, setTotalSeats] = useState<number>(0);
  const [showSeatMap, setShowSeatMap] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [error, setError] = useState('');

  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tokenInput, setTokenInput] = useState('');

  useEffect(() => {
    loadCinemas();
  }, []);


  const loadCinemas = async () => {
    setLoading(true);
    const data = await getCinemas();
    setCinemas(data);
    setLoading(false);
  };

  const handleCinemaSelect = async (cinema: Cinema) => {
    setSelectedCinema(cinema);
    setSearchCinema(cinema.name);
    setMovies([]);
    setSchedules([]);
    setSelectedMovie(null);
    setSelectedSchedule(null);
    setError('');

    setLoading(true);
    const data = await getMoviesByLocation(cinema.location_id);
    setMovies(data);
    setLoading(false);

    if (data.length === 0) {
      setError('Film tidak tersedia.');
    }
  };

  const handleMovieSelect = async (movie: Movie) => {
    setSelectedMovie(movie);
    setSearchMovie(movie.title || movie.name);
    setSchedules([]);
    setSchedulesByDate(new Map());
    setAvailableDates([]);
    setSelectedDate('');
    setSelectedSchedule(null);
    setError('');

    if (!selectedCinema) return;

    setLoadingSchedules(true);
    const schedulesMap = await scanSchedulesNext10Days(
      movie.id,
      selectedCinema.location_id,
      movie.status || 'playing'
    );
    setSchedulesByDate(schedulesMap);

    const dates = Array.from(schedulesMap.keys()).sort();
    setAvailableDates(dates);
    setLoadingSchedules(false);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedSchedule(null);
    const dateSchedules = schedulesByDate.get(date) || [];
    setSchedules(dateSchedules);
  };

  const handleScheduleSelect = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setAvailableSeats(schedule.remaining_seat_count || 0);
    setTotalSeats(schedule.total_seat_count || 0);
    setShowSeatMap(false);
  };

  const filteredCinemas = cinemas.filter(cinema =>
    cinema?.name?.toLowerCase().includes(searchCinema.toLowerCase()) ||
    cinema?.location_name?.toLowerCase().includes(searchCinema.toLowerCase())
  );

  const filteredMovies = movies.filter(movie => {
    const movieTitle = movie?.title || movie?.name || '';
    return movieTitle.toLowerCase().includes(searchMovie.toLowerCase());
  });

  const formatRupiah = (num: number) => {
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  const formatDate = (dateStr: string) => {
    // dateStr format: YYYYMMDD
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${day}/${month}/${year}`;
  };

  if (!cinemas) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-yellow-300" />
            <div>
              <h1 className="text-3xl font-bold text-white">Cek Harga Promo</h1>
              <p className="text-purple-100 text-sm mt-1">
                Temukan promo terbaik untuk tiket CGV Anda
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6">
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-purple-900">
            <strong>Cara Kerja:</strong> Pilih bioskop → Pilih film → Pilih tanggal → Lihat jadwal → Pilih jadwal untuk lihat harga & kursi tersedia
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {loading && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700"></div>
            <span>Memuat data...</span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-purple-600" />
            1. Pilih Bioskop
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchCinema}
              onChange={(e) => {
                setSearchCinema(e.target.value);
                setSelectedCinema(null);
              }}
              placeholder="Ketik nama bioskop atau kota..."
              className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
            />
            <Search className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" />
          </div>

          {searchCinema && !selectedCinema && filteredCinemas.length > 0 && (
            <div className="mt-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-lg">
              {filteredCinemas.map(cinema => (
                <button
                  key={cinema.id}
                  onClick={() => handleCinemaSelect(cinema)}
                  className="w-full text-left px-4 py-3 hover:bg-purple-50 border-b border-gray-100 last:border-b-0 transition"
                >
                  <div className="font-medium text-gray-900">{cinema.name}</div>
                  <div className="text-sm text-gray-500">
                    {cinema.location_name} • {cinema.address}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedCinema && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Film className="w-4 h-4 text-purple-600" />
              2. Pilih Film
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchMovie}
                disabled={loading}
                onChange={(e) => {
                  setSearchMovie(e.target.value);
                  setSelectedMovie(null);
                }}
                placeholder="Ketik nama film..."
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <Search className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" />
            </div>

            {!loading && movies.length === 0 && (
              <div className="mt-2 text-center py-4 text-gray-500 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="font-medium text-yellow-800">Film tidak tersedia</p>
              </div>
            )}

            {!loading && !selectedMovie && filteredMovies.length > 0 && (
              <div className="mt-2 max-h-80 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-lg">
                {filteredMovies.map(movie => (
                  <button
                    key={movie.id}
                    onClick={() => handleMovieSelect(movie)}
                    className="w-full text-left px-4 py-3 hover:bg-purple-50 border-b border-gray-100 last:border-b-0 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-gray-900">{movie.title || movie.name}</div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        movie.status === 'upcoming'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {movie.status === 'upcoming' ? 'Akan Tayang' : 'Sedang Tayang'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedMovie && loadingSchedules && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700"></div>
            <span>
              Scanning jadwal {selectedMovie.status === 'upcoming' ? '20' : '10'} hari kedepan...
            </span>
          </div>
        )}

        {selectedMovie && !loadingSchedules && availableDates.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              3. Pilih Tanggal ({availableDates.length} tanggal tersedia)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {availableDates.map(date => {
                // date format: YYYYMMDD
                const year = date.substring(0, 4);
                const month = date.substring(4, 6);
                const day = date.substring(6, 8);
                const dayName = new Date(`${year}-${month}-${day}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'short' });
                return (
                  <button
                    key={date}
                    onClick={() => handleDateSelect(date)}
                    className={`px-4 py-3 border-2 rounded-lg transition text-center ${
                      selectedDate === date
                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-xs text-gray-500 mb-1">{dayName}</div>
                    <div className="font-bold">{formatDate(date)}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {schedules.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" />
              4. Pilih Jadwal ({formatDate(selectedDate)})
            </label>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {schedules.map((schedule, idx) => (
                <button
                  key={idx}
                  onClick={() => handleScheduleSelect(schedule)}
                  className={`w-full text-left px-4 py-4 border-2 rounded-lg transition ${
                    selectedSchedule?.schedule_id === schedule.schedule_id
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-lg text-gray-900">{schedule.start_time}</div>
                      <div className="text-sm text-gray-600">{schedule.auditorium_type_name}</div>
                      <div className="text-xs text-gray-500">{schedule.auditorium_name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-purple-600">{formatRupiah(schedule.price)}</div>
                      <div className="text-xs text-gray-500">per tiket</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedSchedule && (
          <div className="mt-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-6 h-6 text-green-600" />
              <h3 className="text-xl font-bold text-green-900">Detail Harga & Kursi</h3>
            </div>

            <div>
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-white px-4 py-3 rounded-lg">
                  <span className="text-gray-700 font-medium">Harga 1 Tiket Normal:</span>
                  <span className="text-2xl font-bold text-green-600">
                    {formatRupiah(selectedSchedule.price)}
                  </span>
                </div>

                <button
                  onClick={() => setShowSeatMap(true)}
                  className="w-full flex justify-between items-center bg-white px-4 py-3 rounded-lg hover:bg-blue-50 transition-colors border-2 border-transparent hover:border-blue-300 group"
                >
                  <span className="text-gray-700 font-medium group-hover:text-blue-700">Kursi Tersedia:</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-blue-600">
                      {availableSeats} / {totalSeats} kursi
                    </span>
                    <ChevronRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                <div className="flex justify-between items-center bg-green-100 px-4 py-3 rounded-lg border-t-2 border-green-300 mt-4">
                  <span className="text-green-900 font-semibold">Jam Film:</span>
                  <span className="text-xl font-bold text-green-700">
                    {selectedSchedule.start_time} - {selectedSchedule.end_time}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-green-100 px-4 py-3 rounded-lg">
                  <span className="text-green-900 font-semibold">Studio:</span>
                  <span className="text-lg font-bold text-green-700">
                    {selectedSchedule.auditorium_name}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showSeatMap && selectedSchedule && selectedCinema && selectedMovie && (
        <SeatMap
          scheduleId={selectedSchedule.schedule_id}
          scheduleTime={selectedSchedule.start_time}
          schedulePrice={selectedSchedule.price}
          cinemaName={selectedCinema.name}
          locationName={selectedCinema.location_name}
          movieName={selectedMovie.title || selectedMovie.name}
          selectedDate={selectedDate}
          auditoriumName={selectedSchedule.auditorium_name}
          onClose={() => setShowSeatMap(false)}
        />
      )}
    </div>
  );
}
