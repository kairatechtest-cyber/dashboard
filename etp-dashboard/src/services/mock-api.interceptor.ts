import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { ChartDataPoint, HistoricalData, HistoricalParameterData } from './dashboard-data.service';
import { User } from './user-data.service';

// --- JWT and User Management Helpers ---

const AUTH_USERS_KEY = 'etp_dashboard_users';
const JWT_SECRET = 'your-super-secret-key-for-mocking'; // In a real app, this is server-side only.

function getUsersFromStorage(): User[] {
  const storedUsers = localStorage.getItem(AUTH_USERS_KEY);
  return storedUsers ? JSON.parse(storedUsers) : [];
}

function saveUsersToStorage(users: User[]): void {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function createFakeToken(user: Omit<User, 'password' | 'signupDate'> & { profileImage?: string | null }): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
        ...user,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hour expiry
    };
    
    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '');
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '');
    
    // In a real app, the signature is a crypto hash. Here, it's just a fake one.
    const signature = btoa(`${encodedHeader}.${encodedPayload}.${JWT_SECRET}`).replace(/=/g, '');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyFakeToken(token: string): { valid: boolean; payload?: any } {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return { valid: false };
        const [encodedHeader, encodedPayload] = parts;

        const payload = JSON.parse(atob(encodedPayload));
        
        if (payload.exp * 1000 < Date.now()) {
            console.warn('Mock API: Token expired');
            return { valid: false };
        }
        
        // We skip signature verification because it's a mock.
        return { valid: true, payload };
    } catch (e) {
        console.error('Mock API: Token verification failed', e);
        return { valid: false };
    }
}


// --- Data Generation Logic ---

function _randomizeValue(value: number, factor = 0.05): number {
    const randomFactor = (Math.random() - 0.5) * factor;
    const newValue = value * (1 + randomFactor);
    const decimalPlaces = (String(value).split('.')[1] || '').length;
    return parseFloat(newValue.toFixed(decimalPlaces));
}

// Base data for randomization remains unchanged
const baseKpiData = [
    { title: 'V-V', value: 402, unit: 'V', icon: 'M3.75 13.5l3.75-3.75L11.25 13.5m-7.5-6l3.75 3.75L11.25 7.5' },
    { title: 'Instance KW', value: 42.9, unit: 'KW', icon: 'M3.75 13.5l3.75-3.75L11.25 13.5m-7.5-6l3.75 3.75L11.25 7.5' },
    { title: 'Effluent Flow', value: 214, unit: 'm³/hr', icon: 'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3' },
    { title: 'Energy/Day', value: 440, unit: 'KWH', icon: 'M13.5 10.5V6.75a4.5 4.5 0 00-9 0v3.75m11.25 3.75v-1.5a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75' },
    { title: 'Cumulative Flow', value: 1440, unit: 'm³', icon: 'M4.5 12.75l7.5-7.5 7.5 7.5m-15 6l7.5-7.5 7.5 7.5' },
    { title: 'Power eff.', value: 0.310, unit: 'KWH/m³', icon: 'M10.5 6a7.5 7.5 0 100 15 7.5 7.5 0 000-15zM10.5 0a10.5 10.5 0 100 21 10.5 10.5 0 000-21z' },
    { title: 'Silica', value: 2.47, unit: 'ppm', icon: 'M14.25 6.087c0 .596.484 1.08 1.08 1.08.596 0 1.08-.484 1.08-1.08 0-.596-.484-1.08-1.08-1.08-.596 0-1.08.484-1.08 1.08zM9 6.087c0 .596.484 1.08 1.08 1.08.596 0 1.08-.484 1.08-1.08 0-.596-.484-1.08-1.08-1.08-.596 0-1.08.484-1.08 1.08zM9 12.087c0 .596.484 1.08 1.08 1.08.596 0 1.08-.484 1.08-1.08 0-.596-.484-1.08-1.08-1.08-.596 0-1.08.484-1.08 1.08zM14.25 12.087c0 .596.484 1.08 1.08 1.08.596 0 1.08-.484 1.08-1.08 0-.596-.484-1.08-1.08-1.08-.596 0-1.08.484-1.08 1.08zM9 18.087c0 .596.484 1.08 1.08 1.08.596 0 1.08-.484 1.08-1.08 0-.596-.484-1.08-1.08-1.08-.596 0-1.08.484-1.08 1.08zM14.25 18.087c0 .596.484 1.08 1.08 1.08.596 0 1.08-.484 1.08-1.08 0-.596-.484-1.08-1.08-1.08-.596 0-1.08.484-1.08 1.08z' },
];
// Other base data definitions... (omitted for brevity, they are the same)
const baseInfluentSubKpis = {
    title: 'Influent Parameter',
    metrics: [
        { label: 'Flow (m³/hr)', value: 221, color: 'text-green-400' }, { label: 'TDS (ppm)', value: 109, color: 'text-green-400' },
        { label: 'pH', value: 8.26, color: 'text-green-400' }, { label: 'Conductivity (Micron)', value: 69.4, color: 'text-green-400' }
    ]
};
const baseEffluentSubKpis = {
    title: 'Effluent Parameter',
    metrics: [
        { label: 'Flow (m³/hr)', value: 214, color: 'text-green-400' }, { label: 'TDS (ppm)', value: 44.1, color: 'text-green-400' },
        { label: 'pH', value: 7.18, color: 'text-green-400' }, { label: 'Conductivity (Micron)', value: 62.4, color: 'text-green-400' }
    ]
};
const baseInfluentParams = [
    { name: 'HYPO DOSING (LPH)', value: 1.93 }, { name: 'OSP LEVEL (MT)', value: 4.88 },
    { name: 'SHT LEVEL (MT)', value: 3.63 }, { name: 'HRSSC Turbidity (NTU)', value: 1.39 },
];
const baseEffluentParams = [
    { name: 'MORPHLINE DOSING (LPH)', value: 1.78 }, { name: 'CWST Level (MT)', value: 2.82 },
    { name: 'DMF-A Diff (Bar)', value: 0.54 }, { name: 'DMF-B Diff (Bar)', value: 0.65 },
    { name: 'DMF-Outlet Turbidity (NTU)', value: 0.85 }, { name: 'ACF Diff (Bar)', value: 0.44 },
    { name: 'UF-Outlet Turbidity (NTU)', value: 0.46 },
];
const basePumpStatus = [
    { name: 'P1', condu: 49.3, rpm: 1452, currer: 10.1, instfl: 91.8, cumul: 500, 'life': 90, 'diffp': 1.4 },
    { name: 'P2', condu: 50.2, rpm: 1466, currer: 9.82, instfl: 90.8, cumul: 540, 'life': 89.5, 'diffp': 1.5 },
];
const basePumpStage1A = { conductivity: 49.2, rpm: 1441, current: 10.2, cumulativeFlow: 729, life: 99.6 };
const basePumpStage1B = { conductivity: 49.8, rpm: 1467, current: 9.71, cumulativeFlow: 717, life: 99.6 };
const basePumpStage1C = { conductivity: 51.0, rpm: 1436, current: 10.1, cumulativeFlow: 717, life: 99.6 };
const basePumpStage2A = { conductivity: 59.6, rpm: 1442, current: 9.72, cumulativeFlow: 701, life: 99.7 };
const basePumpStage2B = { conductivity: 59.2, rpm: 1462, current: 9.77, cumulativeFlow: 897, life: 99.6 };
const basePumpStage2C = { conductivity: 60.2, rpm: 1436, current: 10.1, cumulativeFlow: 798, life: 99.6 };
const baseAcidDosingParams = [
    { name: 'ORP', value: '+86' as string | number }, { name: 'ACID Dosing RO1 (LPH)', value: 0.89 },
    { name: 'ACID Dosing RO2 (LPH)', value: 0.85 }, { name: 'SMBS Dosing RO (LPH)', value: 1.19 },
    { name: 'Antiscalant Dosing RO1 (LPH)', value: 1.57 }, { name: 'Antiscalant Dosing RO2 (LPH)', value: 1.52 },
];
const baseDailyFlowData: ChartDataPoint[] = [
    { time: '06:00', value: 205 }, { time: '06:30', value: 215 }, { time: '07:00', value: 240 },
    { time: '07:30', value: 230 }, { time: '08:00', value: 255 }, { time: '08:30', value: 260 },
    { time: '09:00', value: 245 }, { time: '09:30', value: 220 }, { time: '10:00', value: 210 },
];
const baseTdsData: ChartDataPoint[] = [
    { time: '06:00', value: 45 }, { time: '07:00', value: 55 }, { time: '08:00', value: 62 },
    { time: '09:00', value: 58 }, { time: '10:00', value: 51 },
];
const baseDailyTdsData: ChartDataPoint[] = [
    { time: '06:00', value: 1.78 }, { time: '07:00', value: 1.85 }, { time: '08:00', value: 1.95 },
    { time: '09:00', value: 1.90 }, { time: '10:00', value: 1.82 },
];
const basePhData: ChartDataPoint[] = [
    { time: '06:00', value: 7.1 }, { time: '06:30', value: 7.2 }, { time: '07:00', value: 7.3 },
    { time: '07:30', value: 7.15 }, { time: '08:00', value: 7.0 }, { time: '08:30', value: 7.25 },
    { time: '09:00', value: 7.4 }, { time: '09:30', value: 7.3 }, { time: '10:00', value: 7.2 },
];

function getMockRealtimeData() {
    // This function remains largely the same as before.
     const effluentSubKpis = {
        ...baseEffluentSubKpis,
        metrics: baseEffluentSubKpis.metrics.map(metric => {
            let value = _randomizeValue(metric.value as number);
            if (Math.random() < 0.2) { // 20% chance to go out of range
                if (metric.label.toLowerCase().includes('flow')) { value = Math.random() < 0.5 ? 195 : 235; }
                else if (metric.label.toLowerCase().includes('tds')) { value = Math.random() < 0.5 ? 38 : 52; }
                else if (metric.label.toLowerCase().includes('ph')) { value = Math.random() < 0.5 ? 6.1 : 7.9; }
                else if (metric.label.toLowerCase().includes('conductivity')) { value = Math.random() < 0.5 ? 58 : 72; }
            }
            return { ...metric, value };
        })
    };
    const updatePump = (pumpData: any) => ({ ...pumpData, conductivity: _randomizeValue(pumpData.conductivity), rpm: Math.round(_randomizeValue(pumpData.rpm)), current: _randomizeValue(pumpData.current), cumulativeFlow: Math.round(_randomizeValue(pumpData.cumulativeFlow)), life: _randomizeValue(pumpData.life) });
    const updateChart = (data: ChartDataPoint[]) => data.map(point => ({...point, value: _randomizeValue(point.value)}));
    return {
        kpiData: baseKpiData.map(kpi => ({ ...kpi, value: _randomizeValue(kpi.value as number) })),
        influentSubKpis: { ...baseInfluentSubKpis, metrics: baseInfluentSubKpis.metrics.map(m => ({ ...m, value: _randomizeValue(m.value) })) },
        effluentSubKpis,
        influentParams: baseInfluentParams.map(p => ({ ...p, value: _randomizeValue(p.value) })),
        effluentParams: baseEffluentParams.map(p => ({ ...p, value: _randomizeValue(p.value) })),
        pumpStatus: basePumpStatus.map(p => ({ ...p, condu: _randomizeValue(p.condu), rpm: Math.round(_randomizeValue(p.rpm)), currer: _randomizeValue(p.currer), instfl: _randomizeValue(p.instfl), cumul: Math.round(_randomizeValue(p.cumul)), life: _randomizeValue(p.life), diffp: _randomizeValue(p.diffp), })),
        pumpStage1A: updatePump(basePumpStage1A), pumpStage1B: updatePump(basePumpStage1B), pumpStage1C: updatePump(basePumpStage1C),
        pumpStage2A: updatePump(basePumpStage2A), pumpStage2B: updatePump(basePumpStage2B), pumpStage2C: updatePump(basePumpStage2C),
        acidDosingParams: baseAcidDosingParams.map(p => (typeof p.value === 'number') ? { ...p, value: _randomizeValue(p.value) } : p),
        dailyFlowData: updateChart(baseDailyFlowData), tdsData: updateChart(baseTdsData),
        dailyTdsData: updateChart(baseDailyTdsData), phData: updateChart(basePhData)
    };
}

function generateHistoricalParameterSet(startDate: Date, endDate: Date, baseValue: number, evolutionFactor: number, dailyRandomFactor: number): HistoricalParameterData {
    const chartData: ChartDataPoint[] = [];
    const tableData: { date: string; avg: number; min: number; max: number }[] = [];
    let currentDate = new Date(startDate);
    let evolvingBase = baseValue;

    while (currentDate <= endDate) {
        const dailyValues: number[] = [];
        for (let i = 0; i < 5; i++) { // Simulate 5 readings per day
            dailyValues.push(_randomizeValue(evolvingBase, dailyRandomFactor));
        }

        const avg = dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length;
        const min = Math.min(...dailyValues);
        const max = Math.max(...dailyValues);

        const dateString = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        chartData.push({ time: dateString, value: parseFloat(avg.toFixed(2)) });
        tableData.push({
            date: currentDate.toISOString().split('T')[0],
            avg: parseFloat(avg.toFixed(2)),
            min: parseFloat(min.toFixed(2)),
            max: parseFloat(max.toFixed(2))
        });

        currentDate.setDate(currentDate.getDate() + 1);
        evolvingBase = _randomizeValue(evolvingBase, evolutionFactor); // Evolve the base value slightly over time
    }
    return { chartData, tableData };
}

function getMockHistoricalData(startDateStr: string, endDateStr: string): HistoricalData {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    return {
        inflow: {
            flow: generateHistoricalParameterSet(new Date(startDate), new Date(endDate), 221, 0.01, 0.05),
            tds: generateHistoricalParameterSet(new Date(startDate), new Date(endDate), 109, 0.02, 0.08),
            ph: generateHistoricalParameterSet(new Date(startDate), new Date(endDate), 8.2, 0.005, 0.02),
        },
        effluent: {
            flow: generateHistoricalParameterSet(new Date(startDate), new Date(endDate), 214, 0.01, 0.05),
            tds: generateHistoricalParameterSet(new Date(startDate), new Date(endDate), 44, 0.03, 0.1),
            ph: generateHistoricalParameterSet(new Date(startDate), new Date(endDate), 7.2, 0.005, 0.03),
        }
    };
}

// --- The Interceptor ---

export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {

    // --- Authentication Endpoints ---

    // Signup
    if (req.url.endsWith('/api/auth/signup') && req.method === 'POST') {
        const { name, email, phone, password } = req.body as any;
        const users = getUsersFromStorage();
        if (users.some(u => u.email === email)) {
            return of(new HttpResponse({ status: 409, body: { message: 'User already exists' } })).pipe(delay(500));
        }
        const newUser: User = { name, email, phone, password, signupDate: new Date().toISOString() };
        users.push(newUser);
        saveUsersToStorage(users);
        const token = createFakeToken({ name, email, phone });
        return of(new HttpResponse({ status: 201, body: { token } })).pipe(delay(500));
    }

    // Login
    if (req.url.endsWith('/api/auth/login') && req.method === 'POST') {
        const { email, password } = req.body as any;
        const users = getUsersFromStorage();
        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
            const token = createFakeToken({ name: user.name, email: user.email, phone: user.phone });
            return of(new HttpResponse({ status: 200, body: { token } })).pipe(delay(500));
        }
        return of(new HttpResponse({ status: 401, body: { message: 'Invalid credentials' } })).pipe(delay(500));
    }

    // Social Login
    if (req.url.endsWith('/api/auth/social-login') && req.method === 'POST') {
        const { provider } = req.body as any;
        const email = `${provider.toLowerCase()}.user@example.com`;
        let users = getUsersFromStorage();
        let user = users.find(u => u.email === email);

        if (!user) {
            user = {
                name: `${provider} User`,
                email,
                phone: 'N/A',
                password: 'social_login_mock_password',
                signupDate: new Date().toISOString()
            };
            users.push(user);
            saveUsersToStorage(users);
        }
        const token = createFakeToken({ name: user.name, email: user.email, phone: user.phone });
        return of(new HttpResponse({ status: 200, body: { token } })).pipe(delay(500));
    }

    // --- Password Reset Endpoints ---

    // Forgot Password
    if (req.url.endsWith('/api/auth/forgot-password') && req.method === 'POST') {
        const { email } = req.body as any;
        const users = getUsersFromStorage();
        const user = users.find(u => u.email === email);
        
        if (user) {
            // In a real app, this token would be securely generated, stored with an expiry,
            // and sent in an email link. Here, we just log it to the console.
            const token = `reset-token-for-${btoa(user.email)}-at-${Date.now()}`;
            console.log('--- MOCK PASSWORD RESET ---');
            console.log(`User: ${user.email}`);
            console.log(`Reset Token: ${token}`);
            console.log(`Reset Link (copy and paste into URL): /#/reset-password/${token}`);
            console.log('---------------------------');
        }
        
        // Always return success to prevent email enumeration.
        return of(new HttpResponse({ status: 200, body: { message: 'If a user exists with that email, a reset link has been sent.' } })).pipe(delay(500));
    }

    // Reset Password
    if (req.url.endsWith('/api/auth/reset-password') && req.method === 'POST') {
        const { token, password } = req.body as any;

        if (!token || !token.startsWith('reset-token-for-') || !password) {
             return of(new HttpResponse({ status: 400, body: { message: 'Invalid request' } })).pipe(delay(500));
        }

        try {
            const parts = token.split('-at-');
            const timestamp = parseInt(parts[1], 10);
            const emailb64 = parts[0].replace('reset-token-for-', '');
            const email = atob(emailb64);

            // Mock token expiry of 1 hour
            if (Date.now() - timestamp > 60 * 60 * 1000) {
                 return of(new HttpResponse({ status: 400, body: { message: 'Token expired' } })).pipe(delay(500));
            }

            const users = getUsersFromStorage();
            const userIndex = users.findIndex(u => u.email === email);
            if (userIndex > -1) {
                users[userIndex].password = password;
                saveUsersToStorage(users);
                return of(new HttpResponse({ status: 200, body: { message: 'Password updated successfully' } })).pipe(delay(500));
            }
        } catch(e) {
            // Catches errors from atob or splitting if token is malformed.
        }
        
        // Generic failure for invalid token/user not found
        return of(new HttpResponse({ status: 400, body: { message: 'Invalid or expired token' } })).pipe(delay(500));
    }

    // --- Protected Data Endpoints ---
    const authHeader = req.headers.get('Authorization');
    
    // New endpoint for profile image update
    if (req.url.endsWith('/api/user/profile-image') && req.method === 'PUT') {
        if (!authHeader?.startsWith('Bearer ')) {
            return of(new HttpResponse({ status: 401, body: { message: 'Authorization header missing' } }));
        }
        const token = authHeader.split(' ')[1];
        const verification = verifyFakeToken(token);
        if (!verification.valid) {
            return of(new HttpResponse({ status: 401, body: { message: 'Invalid or expired token' } }));
        }

        const { imageDataUrl } = req.body as any;
        const userPayload = verification.payload;
        
        const newToken = createFakeToken({
            name: userPayload.name,
            email: userPayload.email,
            phone: userPayload.phone,
            profileImage: imageDataUrl
        });

        return of(new HttpResponse({ status: 200, body: { token: newToken } })).pipe(delay(1000));
    }

    // Check for profile update endpoint first, as it's a special case before the generic check
    if (req.url.endsWith('/api/user/profile') && req.method === 'PUT') {
        if (!authHeader?.startsWith('Bearer ')) {
            return of(new HttpResponse({ status: 401, body: { message: 'Authorization header missing' } }));
        }
        const token = authHeader.split(' ')[1];
        const verification = verifyFakeToken(token);
        if (!verification.valid) {
            return of(new HttpResponse({ status: 401, body: { message: 'Invalid or expired token' } }));
        }

        const { name, phone } = req.body as any;
        const userPayload = verification.payload;
        const users = getUsersFromStorage();
        const userIndex = users.findIndex(u => u.email === userPayload.email);

        if (userIndex > -1) {
            users[userIndex].name = name;
            users[userIndex].phone = phone;
            saveUsersToStorage(users);

            // Issue a new token with updated details, preserving the profile image
            const newToken = createFakeToken({ 
                name, 
                email: userPayload.email, 
                phone, 
                profileImage: userPayload.profileImage 
            });
            return of(new HttpResponse({ status: 200, body: { token: newToken } })).pipe(delay(500));
        }

        return of(new HttpResponse({ status: 404, body: { message: 'User not found' } })).pipe(delay(500));
    }


    if (req.url.includes('/api/') && !authHeader?.startsWith('Bearer ')) {
        return of(new HttpResponse({ status: 401, body: { message: 'Authorization header missing' } }));
    }
    
    if (req.url.includes('/api/') && authHeader) {
        const token = authHeader.split(' ')[1];
        const verification = verifyFakeToken(token);
        if (!verification.valid) {
            return of(new HttpResponse({ status: 401, body: { message: 'Invalid or expired token' } }));
        }
    }

    // Mock for real-time dashboard data
    if (req.url.endsWith('/api/dashboard-data')) {
        const mockData = getMockRealtimeData();
        return of(new HttpResponse({ status: 200, body: mockData })).pipe(delay(150));
    }

    // Mock for historical data
    if (req.url.endsWith('/api/historical-data') && req.method === 'GET') {
        const startDate = req.params.get('startDate');
        const endDate = req.params.get('endDate');

        if (!startDate || !endDate) {
            return of(new HttpResponse({ status: 400, statusText: 'Bad Request', body: 'Missing date parameters' }));
        }

        const mockData = getMockHistoricalData(startDate, endDate);
        return of(new HttpResponse({ status: 200, body: mockData })).pipe(delay(1000));
    }

    // Pass through any other requests
    return next(req);
};
