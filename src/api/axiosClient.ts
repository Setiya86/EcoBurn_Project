import axios from 'axios';

const API_URL = 'http://localhost:8000/api'; // PASTIKAN SESUAI DENGAN LARAVEL ANDA

// 1. Buat instance Axios
const axiosClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }
});

let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (error: any) => void }[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 2. Request Interceptor: Menambahkan token ke header
axiosClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 3. Response Interceptor: Menangani token expired (401)
axiosClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        // Hanya tangani error 401 dan pastikan belum pernah di-retry
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            
            // Cek apakah token expired karena memang sudah lewat masa refresh (401 dari endpoint /refresh)
            if (originalRequest.url === `${API_URL}/refresh`) {
                localStorage.removeItem('access_token');
                // Redirect ke halaman login atau tampilkan pesan error
                window.location.href = '/login'; 
                return Promise.reject(error);
            }
            
            if (isRefreshing) {
                // Jika sudah ada request yang sedang refresh, masukkan request ini ke antrian
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return axiosClient(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            return new Promise(async (resolve, reject) => {
                try {
                    const rs = await axios.post(`${API_URL}/refresh`);
                    const { access_token } = rs.data;

                    localStorage.setItem('access_token', access_token);
                    axiosClient.defaults.headers.common.Authorization = `Bearer ${access_token}`;

                    processQueue(null, access_token);
                    originalRequest.headers.Authorization = `Bearer ${access_token}`;
                    resolve(axiosClient(originalRequest));

                } catch (err) {
                    processQueue(err, null);
                    localStorage.removeItem('access_token');
                    window.location.href = '/login'; // Redirect jika refresh gagal total
                    reject(err);
                } finally {
                    isRefreshing = false;
                }
            });
        }

        return Promise.reject(error);
    }
);

export default axiosClient;