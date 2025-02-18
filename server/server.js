const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const File = require('./models/file');
const AdmZip = require('adm-zip');
const mm = require('music-metadata');
const fs = require('fs');

const app = express();

// 中间件配置
app.use(cors());
app.use(express.json());

// 配置静态文件服务
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 配置根路径返回index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/index.html'));
});

// 获取可下载文件列表
app.get('/api/downloadable-files', async (req, res) => {
    try {
        // 获取所有文件并按上传时间倒序排序
        const files = await File.find().sort({ uploadDate: -1 });
        
        // 使用 Map 来存储唯一文件，以路径为键
        const uniqueFiles = new Map();
        
        for (const file of files) {
            // 检查文件是否物理存在
            if (fs.existsSync(file.path)) {
                // 如果文件路径不在 Map 中，则添加
                if (!uniqueFiles.has(file.path)) {
                    uniqueFiles.set(file.path, {
                        _id: file._id,
                        name: file.originalName, // 使用原始文件名
                        artist: file.artist,
                        path: file.path,
                        uploadDate: file.uploadDate
                    });
                } else {
                    // 如果是重复文件，删除数据库记录
                    await File.findByIdAndDelete(file._id);
                }
            } else {
                // 如果文件不存在，删除数据库记录
                await File.findByIdAndDelete(file._id);
            }
        }
        
        // 返回唯一文件列表
        res.json(Array.from(uniqueFiles.values()));
    } catch (error) {
        console.error('获取文件列表错误:', error);
        res.status(500).json({ error: '获取文件列表失败' });
    }
});

// 文件上传配置
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        // 解决文件名乱码问题
        const originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, Date.now() + '-' + originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024,
        files: 10
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('仅支持音频文件'), false);
        }
    }
}).array('files');

// 文件上传接口
app.post('/api/upload', (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            console.error('上传错误:', err);
            return res.status(400).json({ error: err.message });
        }
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: '没有上传文件' });
        }

        try {
            const savedFiles = [];

            for (const file of req.files) {
                // 检查是否已存在同名文件
                const existingFile = await File.findOne({ originalName: file.originalname });
                if (existingFile) {
                    // 如果存在，删除旧文件和记录
                    if (fs.existsSync(existingFile.path)) {
                        fs.unlinkSync(existingFile.path);
                    }
                    await File.findByIdAndDelete(existingFile._id);
                }

                // 创建新文件记录
                const newFile = new File({
                    name: file.originalname,
                    originalName: file.originalname,
                    path: file.path,
                    artist: '未知艺术家', // 默认值或根据需要提取
                    uploadDate: new Date()
                });

                const savedFile = await newFile.save();
                savedFiles.push(savedFile);
            }

            res.json({
                success: true,
                files: savedFiles
            });
        } catch (error) {
            console.error('数据库保存错误:', error);
            res.status(500).json({ error: '文件保存失败' });
        }
    });
});

// 连接MongoDB
mongoose.connect('mongodb://localhost:27017/audio-website', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB连接成功');
}).catch(err => {
    console.error('MongoDB连接失败:', err);
});

// 文件下载接口
app.get('/api/download/:id', async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) {
            return res.status(404).json({ error: '文件不存在' });
        }

        if (!fs.existsSync(file.path)) {
            await File.findByIdAndDelete(file._id);
            return res.status(404).json({ error: '文件已被删除' });
        }

        // 使用 encodeURIComponent 处理文件名
        const safeFileName = encodeURIComponent(file.originalName);
        
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${safeFileName}`);
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        
        // 发送文件
        fs.createReadStream(file.path).pipe(res);

    } catch (error) {
        console.error('下载错误:', error);
        res.status(500).json({ error: '下载失败' });
    }
});

// 新增批量下载接口
app.post('/api/batch-download', async (req, res) => {
    try {
        const { fileIds } = req.body;
        const files = await File.find({ _id: { $in: fileIds } });
        
        // 创建ZIP压缩包
        const zip = new AdmZip();
        files.forEach(file => {
            const filePath = path.join(__dirname, '../public/uploads', file.path);
            zip.addLocalFile(filePath);
        });
        
        // 生成临时文件
        const zipPath = path.join(__dirname, '../public/uploads', `batch_${Date.now()}.zip`);
        zip.writeZip(zipPath);
        
        res.json({
            downloadUrl: `/download/batch/${path.basename(zipPath)}`
        });
        
    } catch (error) {
        res.status(500).json({ error: '服务器错误' });
    }
});

// 新增批量下载文件路由
app.get('/download/batch/:filename', (req, res) => {
    const filePath = path.join(__dirname, '../public/uploads', req.params.filename);
    res.download(filePath, () => {
        // 下载完成后删除临时文件
        fs.unlinkSync(filePath);
    });
});

app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        const files = await File.find({
            $or: [
                { name: new RegExp(query, 'i') },
                { artist: new RegExp(query, 'i') }
            ]
        });
        res.json(files);
    } catch (error) {
        res.status(500).json({ error: '搜索失败' });
    }
});

async function getAudioDuration(filePath) {
    // 暂时返回固定值，后续可通过其他方式获取
    return 180; // 默认3分钟
}

// 创建uploads目录（如果不存在）
const uploadsDir = path.join(__dirname, '../uploads');
if (!require('fs').existsSync(uploadsDir)){
    require('fs').mkdirSync(uploadsDir);
}

// 启动服务器
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log('上传目录:', uploadsDir);
});