require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const os = require('os');
const multer = require('multer'); // নতুন যুক্ত হলো

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Multer সেটআপ (ছবি মেমোরিতে রিসিভ করার জন্য)
const upload = multer({ storage: multer.memoryStorage() });

// ================= API ROUTES =================

app.get('/api/stats', (req, res) => {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const ramUsage = (((totalMem - freeMem) / totalMem) * 100).toFixed(1);
    const cpuLoad = os.loadavg()[0].toFixed(1);
    const ping = Math.floor(Math.random() * 15) + 10;
    res.json({ cpu: cpuLoad, ram: ramUsage, ping: ping });
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const { data } = await supabase.from('admin_data').select('*').eq('username', username).eq('password', password).single();
    if (data) res.json({ success: true, message: 'Auth Granted' });
    else res.json({ success: false, message: 'Invalid Credentials' });
});

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

app.get('/api/gallery', async (req, res) => {
    const { data } = await supabase.from('gallery').select('*').order('created_at', { ascending: false });
    res.json(data);
});

// নতুন: পিসি থেকে ছবি আপলোড করার API
app.post('/api/gallery', upload.single('image'), async (req, res) => {
    try {
        const { title, subtitle, details } = req.body;
        const file = req.file;

        if (!file) return res.status(400).json({ success: false, message: 'No image provided' });

        // ফাইলের একটি ইউনিক নাম তৈরি করা
        const fileName = `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;

        // ১. Supabase Storage-এ ছবি আপলোড
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('portfolio_images')
            .upload(fileName, file.buffer, { contentType: file.mimetype });

        if (uploadError) throw uploadError;

        // ২. আপলোড করা ছবির পাবলিক লিংক (URL) বের করা
        const { data: publicUrlData } = supabase.storage
            .from('portfolio_images')
            .getPublicUrl(fileName);

        const image_url = publicUrlData.publicUrl;

        // ৩. লিংক এবং টাইটেল ডাটাবেস টেবিলে সেভ করা
        const { error: dbError } = await supabase.from('gallery').insert([{ image_url, title, subtitle, details }]);
        
        if (dbError) throw dbError;
        res.json({ success: true });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/gallery/:id', async (req, res) => {
    const { error } = await supabase.from('gallery').delete().eq('id', req.params.id);
    res.json({ success: !error });
});

app.listen(port, () => {
    console.log(`[SYSTEM_ONLINE] Server running on http://localhost:${port}`);
});