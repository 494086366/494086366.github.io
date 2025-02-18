const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const mongoose = require('mongoose');
const File = require('./models/file'); // 确保有这个模型文件

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const fileSchema = new mongoose.Schema({
    name: String,
    path: String,
    category: String,
    downloaded: { type: Number, default: 0 },
    uploadDate: { type: Date, default: Date.now },
    duration: { type: Number, default: 0 },
    artist: { type: String, default: '未知艺术家' }
});

module.exports = {
    initialize: async () => {
        try {
            await mongoose.connect('mongodb://127.0.0.1:27017/audio_db', {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000,
                connectTimeoutMS: 10000
            });
            console.log('数据库已连接');
            
            // 临时注释索引创建
            // await db.collection('files').createIndex({ name: 1 });
        } catch (error) {
            console.error('数据库连接失败:', error);
            process.exit(1);
        }
    },

    addFile: async (fileData) => {
        try {
            const file = new File(fileData);
            return await file.save();
        } catch (err) {
            console.error('保存文件失败:', err);
            throw err;
        }
    },

    getAllFiles() {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM files', (err, rows) => {
                err ? reject(err) : resolve(rows);
            });
        });
    },

    getFile: async (id) => {
        return File.findById(id);
    },

    markDownloaded: async (id) => {
        await File.findByIdAndUpdate(id, { $inc: { downloaded: 1 } });
    },

    getFilesByCategory(category) {
        return new Promise((resolve, reject) => {
            db.all(
                'SELECT * FROM files WHERE category = ? ORDER BY uploaded_at DESC',
                [category],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    },

    getFilesByQuery: async (query) => {
        try {
            return await File.find(query).exec();
        } catch (error) {
            console.error('数据库查询错误:', error);
            throw new Error('无法获取文件列表');
        }
    },

    getFilesByIds: async (ids) => {
        return File.find({ _id: { $in: ids } }).exec();
    }
};