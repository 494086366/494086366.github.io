const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    name: String,
    originalName: String,
    path: String,
    category: String,
    downloaded: { type: Number, default: 0 },
    uploadDate: { type: Date, default: Date.now },
    duration: { type: Number, default: 180 },
    artist: { type: String, default: '未知艺术家' }
});

module.exports = mongoose.model('File', fileSchema); 