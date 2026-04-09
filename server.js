require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Multer Setup for Image Upload
const upload = multer({ storage: multer.memoryStorage() });

// ================= AUTH API =================
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const { data, error } = await supabase.from('admin_auth').select('*').eq('username', username).eq('password', password).single();
    if (error || !data) return res.status(401).json({ error: 'Invalid Credentials' });
    res.json({ success: true, message: 'Access Granted' });
});

app.post('/api/forgot-password', async (req, res) => {
    const { username, security_key, new_password } = req.body;
    const { data, error } = await supabase.from('admin_auth').update({ password: new_password }).eq('username', username).eq('security_key', security_key);
    if (error) return res.status(400).json({ error: 'Validation Failed' });
    res.json({ success: true });
});

app.post('/api/update-auth', async (req, res) => {
    const { old_user, new_user, new_pass } = req.body;
    const { error } = await supabase.from('admin_auth').update({ username: new_user, password: new_pass }).eq('username', old_user);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// ================= IMAGE UPLOAD API =================
app.post('/api/upload', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');
    const fileName = `${Date.now()}-${req.file.originalname}`;
    
    const { data, error } = await supabase.storage.from('portfolio_images').upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype
    });

    if (error) return res.status(500).json({ error: error.message });
    const { data: publicUrl } = supabase.storage.from('portfolio_images').getPublicUrl(fileName);
    res.json({ url: publicUrl.publicUrl });
});

// ================= CRUD FOR ALL SECTIONS =================
const tables = ['profile', 'education', 'arsenal', 'projects', 'achievements', 'gallery', 'messages'];

tables.forEach(table => {
    app.get(`/api/${table}`, async (req, res) => {
        let query = supabase.from(table).select('*');
        if (table === 'education') query = query.order('pass_year', { ascending: false });
        const { data, error } = await query;
        res.json(data || []);
    });

    app.post(`/api/${table}`, async (req, res) => {
        const { data, error } = await supabase.from(table).insert([req.body]);
        res.json(data);
    });

    app.put(`/api/${table}/:id`, async (req, res) => {
        const { data, error } = await supabase.from(table).update(req.body).eq('id', req.params.id);
        res.json(data);
    });

    app.delete(`/api/${table}/:id`, async (req, res) => {
        await supabase.from(table).delete().eq('id', req.params.id);
        res.json({ success: true });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server Online on ${PORT}`));
