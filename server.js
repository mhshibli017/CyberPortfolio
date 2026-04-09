require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const os = require('os'); 
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const upload = multer({ storage: multer.memoryStorage() });

// ================= REAL VISITOR TRACKING MIDDLEWARE =================
app.use((req, res, next) => {
    if (req.path === '/' || req.path === '/index.html') {
        const today = new Date().toISOString().split('T')[0];
        supabase.from('page_views').insert([{ view_date: today }]).then();
    }
    next();
});

app.use(express.static('public'));

// ================= REAL-TIME SYSTEM STATS API =================
app.get('/api/system-stats', async (req, res) => {
    try {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const ramUsagePercent = ((usedMem / totalMem) * 100).toFixed(1);

        const cpus = os.cpus();
        const loadAvg = os.loadavg()[0];
        const cpuUsagePercent = ((loadAvg / cpus.length) * 100).toFixed(1);

        const today = new Date().toISOString().split('T')[0];
        const { count: totalVis } = await supabase.from('page_views').select('*', { count: 'exact', head: true });
        const { count: todayVis } = await supabase.from('page_views').select('*', { count: 'exact', head: true }).eq('view_date', today);

        res.json({
            cpu: cpuUsagePercent,
            ram: ramUsagePercent,
            load: loadAvg.toFixed(2),
            totalVisitors: totalVis || 0,
            todayVisitors: todayVis || 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ================= AUTH API =================
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const { data, error } = await supabase.from('admin_auth').select('*').eq('username', username).eq('password', password).limit(1);
    if (error || !data || data.length === 0) return res.status(401).json({ error: 'Unauthorized Access!' });
    res.json({ success: true });
});

app.post('/api/forgot-creds', async (req, res) => {
    const { username, security_key, new_password } = req.body;
    const { data, error } = await supabase.from('admin_auth').update({ password: new_password }).eq('username', username).eq('security_key', security_key).select();
    if (error || data.length === 0) return res.status(400).json({ error: 'Invalid Username or Key' });
    res.json({ success: true });
});

app.post('/api/update-auth', async (req, res) => {
    const { old_user, new_user, new_pass, new_key } = req.body;
    
    let updatePayload = { username: new_user, password: new_pass };
    // যদি নতুন সিকিউরিটি কী দেওয়া হয়, তবে সেটিও আপডেট হবে
    if (new_key && new_key.trim() !== '') {
        updatePayload.security_key = new_key.trim();
    }

    const { error } = await supabase.from('admin_auth').update(updatePayload).eq('username', old_user);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// ================= PROFILE API =================
app.get('/api/profile', async (req, res) => {
    const { data, error } = await supabase.from('profile').select('*').order('id', { ascending: true }).limit(1);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data && data.length > 0 ? data[0] : {});
});

app.post('/api/profile', async (req, res) => {
    const { full_name, job_title, bio } = req.body;
    const { data: existing } = await supabase.from('profile').select('id').order('id', { ascending: true }).limit(1);
    let result;
    if (existing && existing.length > 0) {
        result = await supabase.from('profile').update({ full_name, job_title, bio }).eq('id', existing[0].id);
    } else {
        result = await supabase.from('profile').insert([{ full_name, job_title, bio }]);
    }
    if (result.error) return res.status(500).json({ error: result.error.message });
    res.json({ message: 'Profile updated successfully' });
});

// ================= UPLOAD API =================
app.post('/api/upload', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).send('No file.');
    const fileName = `${Date.now()}-${req.file.originalname}`;
    const { data, error } = await supabase.storage.from('portfolio_images').upload(fileName, req.file.buffer, { contentType: req.file.mimetype });
    if (error) return res.status(500).json({ error: error.message });
    const { data: pubUrl } = supabase.storage.from('portfolio_images').getPublicUrl(fileName);
    res.json({ url: pubUrl.publicUrl });
});

// ================= UNIVERSAL CRUD API =================
const tables = ['education', 'arsenal', 'projects', 'achievements', 'gallery', 'messages'];

tables.forEach(table => {
    app.get(`/api/${table}`, async (req, res) => {
        let query = supabase.from(table).select('*');
        if (table === 'education') query = query.order('pass_year', { ascending: false });
        if (table === 'messages' || table === 'gallery') query = query.order('created_at', { ascending: false });
        const { data, error } = await query;
        res.json(data || []);
    });

    app.post(`/api/${table}`, async (req, res) => {
        const { data, error } = await supabase.from(table).insert([req.body]);
        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
    });

    app.put(`/api/${table}/:id`, async (req, res) => {
        const { data, error } = await supabase.from(table).update(req.body).eq('id', req.params.id);
        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
    });

    app.delete(`/api/${table}/:id`, async (req, res) => {
        await supabase.from(table).delete().eq('id', req.params.id);
        res.json({ success: true });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`System Online on ${PORT}`));
