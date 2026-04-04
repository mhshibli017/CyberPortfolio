require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const os = require('os');
const multer = require('multer');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const upload = multer({ storage: multer.memoryStorage() });

// System Stats
app.get('/api/stats', (req, res) => {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    res.json({
        cpu: os.loadavg()[0].toFixed(1),
        ram: (((totalMem - freeMem) / totalMem) * 100).toFixed(1),
        ping: Math.floor(Math.random() * 15) + 10,
        total_visitor: 1204,
        today_visitor: 42
    });
});

// Admin Auth & Password Change
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const { data } = await supabase.from('admin_data').select('*').eq('username', username).eq('password', password).single();
    res.json({ success: !!data });
});

app.post('/api/change-password', async (req, res) => {
    const { username, old_password, new_password } = req.body;
    const { data } = await supabase.from('admin_data').select('*').eq('username', username).eq('password', old_password).single();
    if (!data) return res.json({ success: false, message: 'Invalid Username or Old Password' });
    
    const { error } = await supabase.from('admin_data').update({ password: new_password }).eq('id', data.id);
    res.json({ success: !error });
});

// Messages
app.get('/api/messages', async (req, res) => {
    const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
    res.json(data);
});
app.post('/api/messages', async (req, res) => {
    const { identity_name, contact_vector, data_payload } = req.body;
    const { error } = await supabase.from('messages').insert([{ identity_name, contact_vector, data_payload }]);
    res.json({ success: !error });
});
app.delete('/api/messages/:id', async (req, res) => {
    const { error } = await supabase.from('messages').delete().eq('id', req.params.id);
    res.json({ success: !error });
});

// Profile Data
app.get('/api/profile', async (req, res) => {
    const { data } = await supabase.from('profile_data').select('*').limit(1);
    res.json(data[0] || {});
});
app.post('/api/profile', async (req, res) => {
    const { id, full_name, job_title, bio } = req.body;
    const { error } = await supabase.from('profile_data').update({ full_name, job_title, bio }).eq('id', id);
    res.json({ success: !error });
});

// Education Data
app.get('/api/education', async (req, res) => {
    const { data } = await supabase.from('education_data').select('*').order('created_at', { ascending: false });
    res.json(data);
});
app.post('/api/education', async (req, res) => {
    const { degree, institution, pass_year, details } = req.body;
    const { error } = await supabase.from('education_data').insert([{ degree, institution, pass_year, details }]);
    res.json({ success: !error });
});
app.put('/api/education/:id', async (req, res) => {
    const { degree, institution, pass_year, details } = req.body;
    const { error } = await supabase.from('education_data').update({ degree, institution, pass_year, details }).eq('id', req.params.id);
    res.json({ success: !error });
});
app.delete('/api/education/:id', async (req, res) => {
    const { error } = await supabase.from('education_data').delete().eq('id', req.params.id);
    res.json({ success: !error });
});

// Projects Data
app.get('/api/projects', async (req, res) => {
    const { data } = await supabase.from('projects_data').select('*').order('created_at', { ascending: false });
    res.json(data);
});
app.post('/api/projects', async (req, res) => {
    const { title, description, tags } = req.body;
    const { error } = await supabase.from('projects_data').insert([{ title, description, tags }]);
    res.json({ success: !error });
});
app.put('/api/projects/:id', async (req, res) => {
    const { title, description, tags } = req.body;
    const { error } = await supabase.from('projects_data').update({ title, description, tags }).eq('id', req.params.id);
    res.json({ success: !error });
});
app.delete('/api/projects/:id', async (req, res) => {
    const { error } = await supabase.from('projects_data').delete().eq('id', req.params.id);
    res.json({ success: !error });
});

// Achievements Data
app.get('/api/achievements', async (req, res) => {
    const { data } = await supabase.from('achievements_data').select('*').order('created_at', { ascending: false });
    res.json(data);
});
app.post('/api/achievements', async (req, res) => {
    const { title, organization, year, details } = req.body;
    const { error } = await supabase.from('achievements_data').insert([{ title, organization, year, details }]);
    res.json({ success: !error });
});
app.put('/api/achievements/:id', async (req, res) => {
    const { title, organization, year, details } = req.body;
    const { error } = await supabase.from('achievements_data').update({ title, organization, year, details }).eq('id', req.params.id);
    res.json({ success: !error });
});
app.delete('/api/achievements/:id', async (req, res) => {
    const { error } = await supabase.from('achievements_data').delete().eq('id', req.params.id);
    res.json({ success: !error });
});

// Gallery Data
app.get('/api/gallery', async (req, res) => {
    const { data } = await supabase.from('gallery').select('*').order('created_at', { ascending: false });
    res.json(data);
});
app.post('/api/gallery', upload.single('image'), async (req, res) => {
    try {
        const { title, subtitle, details } = req.body;
        const file = req.file;
        if (!file) return res.status(400).json({ success: false, message: 'No image provided' });

        const fileName = `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;
        const { error: uploadError } = await supabase.storage.from('portfolio_images').upload(fileName, file.buffer, { contentType: file.mimetype });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('portfolio_images').getPublicUrl(fileName);
        const { error: dbError } = await supabase.from('gallery').insert([{ image_url: urlData.publicUrl, title, subtitle, details }]);
        if (dbError) throw dbError;
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});
app.delete('/api/gallery/:id', async (req, res) => {
    const { error } = await supabase.from('gallery').delete().eq('id', req.params.id);
    res.json({ success: !error });
});

app.listen(port, () => console.log(`[SYSTEM_ONLINE] Server running on port ${port}`));
