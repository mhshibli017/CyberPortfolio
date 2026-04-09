require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const upload = multer({ storage: multer.memoryStorage() });

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
    const { old_user, new_user, new_pass } = req.body;
    const { error } = await supabase.from('admin_auth').update({ username: new_user, password: new_pass }).eq('username', old_user);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// ================= PROFILE API (100% FIXED) =================
app.get('/api/profile', async (req, res) => {
    const { data, error } = await supabase.from('profile').select('*').order('id', { ascending: true }).limit(1);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data && data.length > 0 ? data[0] : {});
});

app.post('/api/profile', async (req, res) => {
    const { full_name, job_title, bio } = req.body;
    
    // Check existing profile
    const { data: existing } = await supabase.from('profile').select('id').order('id', { ascending: true }).limit(1);
    
    let result;
    if (existing && existing.length > 0) {
        // Update exact ID
        result = await supabase.from('profile').update({ full_name, job_title, bio }).eq('id', existing[0].id);
    } else {
        // Insert new
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
