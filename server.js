const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// 在下载列表接口添加缓存控制
app.get('/api/downloadable-files', (req, res) => {
    res.set('Cache-Control', 'no-store, must-revalidate');
    // ...原有查询逻辑...
});

// 修改multer配置
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
        files: 10
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('仅支持音频文件'), false);
        }
    }
}).array('files'); // 使用array()处理多文件上传

// 修改上传处理
app.post('/api/upload', (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            console.error('上传错误:', err);
            return res.status(400).json({ error: err.message });
        }
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: '未收到有效文件' });
        }

        res.json({
            success: true,
            files: req.files.map(file => ({
                name: file.originalname,
                size: file.size
            }))
        });
    });
}); 