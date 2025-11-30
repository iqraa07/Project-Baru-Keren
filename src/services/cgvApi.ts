// ⚠️ NOTE:
// Token di bawah hanya untuk testing lokal.
// Jangan lupa HAPUS / GANTI sebelum push ke GitHub publik.
const API_BASE = 'https://v2-api.cgv.id';

// --- Auth token & sumbernya ---
let authToken: string | null =
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL3YyLWFwaS5jZ3YuaWQvYXBpL2xvZ2luIiwiaWF0IjoxNzY0NTE1ODA2LCJleHAiOjE3NjQ2MDIyMDYsIm5iZiI6MTc2NDUxNTgwNiwianRpIjoiRE5uWkdIOWdCZVNlVERmQyIsInN1YiI6ImlkYW1yb2hpbUBnbWFpbC5jb20iLCJjaGFubmVsX2NvZGUiOiIwNyIsIm1lbWJlcl9ubyI6IjI1MTA2NjE2NDMyIn0.efa1z5f8aFk2qGH-NW3Y6vXhpWRfdDTa_1eUqxXSxUw';

let authTokenSource: 'hardcoded' | 'manual' = 'hardcoded';

// ❌ Bagian ini dihapus supaya tidak ambil dari ENV lagi
// if (import.meta.env.VITE_CGV_AUTH_TOKEN) {
//   authToken = import.meta.env.VITE_CGV_AUTH_TOKEN;
export function setAuthToken(token: string) {
  authToken = token;
  authTokenSource = 'manual';
  addLog('AUTH_TOKEN_SET', { tokenLength: token?.length || 0, source: authTokenSource });
}

export function getAuthToken(): string | null {
  return authToken;
}

export function hasAuthToken(): boolean {
  return !!authToken;
}

interface DebugLog {
  timestamp: string;
  action: string;
  data: any;
}

const DEBUG_LOGS: DebugLog[] = [];

function addLog(action: string, data: any) {
  DEBUG_LOGS.push({
    timestamp: new Date().toISOString(),
    action,
    data
  });
  // Debug logs disabled for production
}

export function getDebugLogs(): DebugLog[] {
  return DEBUG_LOGS;
}

export function clearDebugLogs() {
  DEBUG_LOGS.length = 0;
}

export function downloadDebugLogs() {
  const dataStr = JSON.stringify(DEBUG_LOGS, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  const exportFileDefaultName = `cgv-debug-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}

interface ApiResponse<T = any> {
  status_code: number;
  message?: string;
  data?: T;
}

interface Cinema {
  id: string;
  name: string;
  location_id: string;
  location_name: string;
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
  auditorium_type?: string;
  remaining_seat_count?: number;
  total_seat_count?: number;
}

interface ScheduleResponse {
  cinemas: Array<{
    id: string;
    name: string;
    schedules: Schedule[];
  }>;
}

async function fetchWithTimeout(url: string, timeout = 10000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const headers: HeadersInit = {
    Accept: 'application/json'
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export async function getCinemas(): Promise<Cinema[]> {
  try {
    const response = await fetchWithTimeout(`${API_BASE}/api/cinemas`);
    const data: ApiResponse<Cinema[]> = await response.json();

    if (data.status_code === 200 && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  } catch (error) {
    return [];
  }
}

export async function getMoviesByLocation(locationId: string): Promise<Movie[]> {
  try {
    const [playingRes, upcomingRes] = await Promise.all([
      fetchWithTimeout(`${API_BASE}/api/movies/playing?location_id=${encodeURIComponent(locationId)}`),
      fetchWithTimeout(`${API_BASE}/api/movies/upcoming?location_id=${encodeURIComponent(locationId)}`)
    ]);

    const playingData: ApiResponse<Movie[]> = await playingRes.json();
    const upcomingData: ApiResponse<Movie[]> = await upcomingRes.json();

    const playing =
      playingData.status_code === 200 && Array.isArray(playingData.data)
        ? playingData.data.map(movie => ({
            ...movie,
            title: movie.name || movie.title || '',
            name: movie.name || movie.title || '',
            status: 'playing' as const
          }))
        : [];

    const upcoming =
      upcomingData.status_code === 200 && Array.isArray(upcomingData.data)
        ? upcomingData.data.map(movie => ({
            ...movie,
            title: movie.name || movie.title || '',
            name: movie.name || movie.title || '',
            status: 'upcoming' as const
          }))
        : [];

    return [...playing, ...upcoming];
  } catch (error) {
    return [];
  }
}

function formatDateYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

export function getTodayIndonesia(): string {
  const d = new Date();
  return formatDateYMD(d);
}

export async function scanSchedulesNext10Days(
  movieId: string,
  locationId: string,
  movieStatus: 'playing' | 'upcoming' = 'playing'
): Promise<Map<string, Schedule[]>> {
  addLog('SCAN_START', {
    movieId,
    locationId,
    movieStatus,
    hasAuthToken: !!authToken,
    tokenSource: authTokenSource // ⬅ tidak baca ENV lagi
  });

  const schedulesByDate = new Map<string, Schedule[]>();
  const today = new Date();

  const scanDays = movieStatus === 'playing' ? 10 : 20;
  const datesToScan: string[] = [];

  for (let i = 0; i <= scanDays; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() + i);
    const dateStr = formatDateYMD(checkDate);
    datesToScan.push(dateStr);
  }

  const fetchDate = async (dateStr: string) => {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() + datesToScan.indexOf(dateStr));
    const formattedDate = formatDateYMD(checkDate);

    try {
      const url = `${API_BASE}/api/movies/${encodeURIComponent(
        movieId
      )}/schedules?location_id=${encodeURIComponent(locationId)}&date=${encodeURIComponent(dateStr)}`;
      addLog('API_REQUEST', {
        date: dateStr,
        url,
        hasAuthHeader: !!authToken,
        authHeaderPresent: authToken ? 'YES' : 'NO'
      });

      const response = await fetchWithTimeout(url);
      const responseText = await response.text();

      let data: ApiResponse<ScheduleResponse>;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        addLog('PARSE_ERROR', {
          date: dateStr,
          responseText: responseText.substring(0, 500),
          parseError: String(parseError)
        });
        return null;
      }

      addLog('API_RESPONSE_RAW', {
        date: dateStr,
        httpStatus: response.status,
        statusCode: data.status_code,
        message: data.message,
        hasData: !!data.data,
        fullResponseBody: data
      });

      if (data.status_code === 200 && data.data?.cinemas) {
        const schedules: Schedule[] = [];
        const cinemasData = data.data.cinemas || [];

        addLog('CINEMAS_DATA', {
          date: dateStr,
          cinemasCount: cinemasData.length,
          fullCinemasArray: cinemasData
        });

        cinemasData.forEach((cinema: any, cinemaIdx: number) => {
          addLog('CINEMA_DETAIL', {
            date: dateStr,
            cinemaIndex: cinemaIdx,
            cinemaName: cinema.name || cinema.cinema_name,
            hasScheduleTypes: Array.isArray(cinema.schedule_types),
            scheduleTypesCount: cinema.schedule_types?.length || 0,
            fullCinemaObject: cinema
          });

          if (Array.isArray(cinema.schedule_types)) {
            cinema.schedule_types.forEach((scheduleType: any, typeIdx: number) => {
              addLog('SCHEDULE_TYPE_DETAIL', {
                date: dateStr,
                cinemaIndex: cinemaIdx,
                typeIndex: typeIdx,
                typeName: scheduleType.name,
                hasSchedules: Array.isArray(scheduleType.schedules),
                schedulesCount: scheduleType.schedules?.length || 0,
                fullScheduleTypeObject: scheduleType
              });

              if (Array.isArray(scheduleType.schedules)) {
                // Parse price from scheduleType.price string (e.g., "From Rp40.000" or "Rp55.000")
                const priceString = scheduleType.price || '';
                const priceMatch = priceString.match(/([0-9.,]+)/);
                const basePrice = priceMatch ? parseInt(priceMatch[1].replace(/[.,]/g, '')) : 0;

                scheduleType.schedules.forEach((schedule: any) => {
                  schedules.push({
                    schedule_id: schedule.schedule_id || schedule.id,
                    start_time: schedule.start_time || schedule.time,
                    end_time: schedule.end_time || '',
                    auditorium_name: scheduleType.auditorium_name || cinema.name || '',
                    auditorium_type_name:
                      scheduleType.auditorium_type_name || scheduleType.name || 'Regular',
                    price: basePrice,
                    auditorium_type: scheduleType.auditorium_type_id,
                    remaining_seat_count: schedule.remaining_seat_count || 0,
                    total_seat_count: schedule.total_seat_count || 0
                  });
                });
              }
            });
          }
        });

        addLog('SCHEDULES_FOUND', { date: dateStr, count: schedules.length, allSchedules: schedules });

        if (schedules.length > 0) {
          return { date: dateStr, schedules };
        } else {
          addLog('NO_SCHEDULES_AFTER_PARSE', { date: dateStr, rawCinemasData: cinemasData });
        }
      } else {
        addLog('API_ERROR', {
          date: dateStr,
          httpStatus: response.status,
          statusCode: data.status_code,
          message: data.message,
          fullResponse: data,
          dataObject: data.data
        });
      }
    } catch (error: any) {
      addLog('EXCEPTION', {
        date: dateStr,
        errorMessage: error?.message || String(error),
        errorStack: error?.stack,
        errorType: error?.constructor?.name
      });
    }
    return null;
  };

  const results = await Promise.all(datesToScan.map(date => fetchDate(date)));

  results.forEach(result => {
    if (result && result.schedules.length > 0) {
      schedulesByDate.set(result.date, result.schedules);
    }
  });

  addLog('SCAN_COMPLETE', {
    totalDatesWithSchedules: schedulesByDate.size,
    dates: Array.from(schedulesByDate.keys())
  });
  return schedulesByDate;
}

export async function getSchedules(
  movieId: string,
  cinemaId: string,
  date: string
): Promise<Schedule[]> {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE}/api/movies/${encodeURIComponent(
        movieId
      )}/schedules?cinema_id=${encodeURIComponent(cinemaId)}&date=${encodeURIComponent(date)}`
    );
    const data: ApiResponse<ScheduleResponse> = await response.json();

    if (data.status_code === 200 && data.data?.cinemas) {
      const allSchedules: Schedule[] = [];
      data.data.cinemas.forEach((cinema: any) => {
        cinema.schedules?.forEach((schedule: any) => {
          allSchedules.push({
            schedule_id: schedule.schedule_id || schedule.id,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            auditorium_name: schedule.auditorium_name || '',
            auditorium_type_name:
              schedule.auditorium_type_name || schedule.auditorium_type?.name || 'Regular',
            price: schedule.price || 0,
            auditorium_type: schedule.auditorium_type
          });
        });
      });
      return allSchedules;
    }
    return [];
  } catch (error) {
    return [];
  }
}

export async function getSeats(scheduleId: string): Promise<any> {
  try {
    addLog('SEATS_API_REQUEST', {
      scheduleId,
      url: `${API_BASE}/api/movie-schedules/${encodeURIComponent(scheduleId)}/seats`,
      hasAuthToken: !!authToken
    });

    const response = await fetchWithTimeout(
      `${API_BASE}/api/movie-schedules/${encodeURIComponent(scheduleId)}/seats`
    );
    const data: ApiResponse = await response.json();

    addLog('SEATS_API_RESPONSE', {
      scheduleId,
      statusCode: data.status_code,
      message: data.message,
      hasData: !!data.data,
      fullResponse: data
    });

    if (data.status_code === 200 && data.data) {
      return data.data;
    }
    return null;
  } catch (error: any) {
    addLog('SEATS_API_ERROR', {
      scheduleId,
      error: error?.message || String(error)
    });
    return null;
  }
}

export function calculatePromoPrice(
  price: number,
  time: string
): { normal: number; promo: number } {
  const normalTotal = price * 2;

  const timeStr = time.replace(':', '.');
  const [hours, minutes] = timeStr.split('.').map(Number);
  const timeInMinutes = hours * 60 + minutes;

  const discount = timeInMinutes < 960 ? 0.25 : 0.15;
  const promoTotal = Math.round(normalTotal * (1 - discount));

  return {
    normal: normalTotal,
    promo: promoTotal
  };
}
