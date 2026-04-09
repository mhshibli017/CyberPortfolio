require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ================= PROFILE API =================
app.get('/api/profile', async (req, res) => {
    const { data, error } = await supabase.from('profile').select('*').maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || {});
});

app.post('/api/profile', async (req, res) => {
    const { full_name, job_title, bio } = req.body;
    const { data: existing } = await supabase.from('profile').select('id').maybeSingle();
    
    let result;
    if (existing) {
        result = await supabase.from('profile').update({ full_name, job_title, bio }).eq('id', existing.id);
    } else {
        result = await supabase.from('profile').insert([{ full_name, job_title, bio }]);
    }
    
    if (result.error) return res.status(500).json({ error: result.error.message });
    res.json({ message: 'Profile updated successfully' });
});

// ================= EDUCATION API =================
app.get('/api/education', async (req, res) => {
    const { data, error } = await supabase.from('education').select('*').order('pass_year', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

app.post('/api/education', async (req, res) => {
    const { institution, degree, pass_year, details, active_thesis, core_focus } = req.body;
    const { data, error } = await supabase.from('education').insert([
        { institution, degree, pass_year, details, active_thesis, core_focus }
    ]);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.put('/api/education/:id', async (req, res) => {
    const { institution, degree, pass_year, details, active_thesis, core_focus } = req.body;
    const { data, error } = await supabase.from('education').update(
        { institution, degree, pass_year, details, active_thesis, core_focus }
    ).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.delete('/api/education/:id', async (req, res) => {
    const { error } = await supabase.from('education').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Deleted successfully' });
});

// ================= ARSENAL API =================
app.get('/api/arsenal', async (req, res) => {
    const { data, error } = await supabase.from('arsenal').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

app.post('/api/arsenal', async (req, res) => {
    const { title, category, details } = req.body;
    const { data, error } = await supabase.from('arsenal').insert([{ title, category, details }]);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.delete('/api/arsenal/:id', async (req, res) => {
    const { error } = await supabase.from('arsenal').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Deleted successfully' });
});

// ================= PROJECTS API =================
app.get('/api/projects', async (req, res) => {
    const { data, error } = await supabase.from('projects').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

app.post('/api/projects', async (req, res) => {
    const { title, description, tags, link } = req.body;
    const { data, error } = await supabase.from('projects').insert([{ title, description, tags, link }]);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.delete('/api/projects/:id', async (req, res) => {
    const { error } = await supabase.from('projects').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Deleted successfully' });
});

// ================= ACHIEVEMENTS API =================
app.get('/api/achievements', async (req, res) => {
    const { data, error } = await supabase.from('achievements').select('*').order('year', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

app.post('/api/achievements', async (req, res) => {
    const { title, organization, year, details } = req.body;
    const { data, error } = await supabase.from('achievements').insert([{ title, organization, year, details }]);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.delete('/api/achievements/:id', async (req, res) => {
    const { error } = await supabase.from('achievements').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Deleted successfully' });
});

// ================= GALLERY API =================
app.get('/api/gallery', async (req, res) => {
    const { data, error } = await supabase.from('gallery').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

app.post('/api/gallery', async (req, res) => {
    const { title, subtitle, image_url, details } = req.body;
    const { data, error } = await supabase.from('gallery').insert([{ title, subtitle, image_url, details }]);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.delete('/api/gallery/:id', async (req, res) => {
    const { error } = await supabase.from('gallery').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Deleted successfully' });
});

// ================= MESSAGES API =================
app.get('/api/messages', async (req, res) => {
    const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

app.post('/api/messages', async (req, res) => {
    const { identity_name, contact_vector, data_payload } = req.body;
    const { data, error } = await supabase.from('messages').insert([{ identity_name, contact_vector, data_payload }]);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.delete('/api/messages/:id', async (req, res) => {
    const { error } = await supabase.from('messages').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Deleted successfully' });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`System Online: Port ${PORT}`);
});
