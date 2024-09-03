const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const urlRoutes = require('./routes/urlRoutes');
const adminRouter = require('./routes/adminRouter');

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use('/auth', authRoutes);
app.use('/api/shorten', urlRoutes);
app.use('/api/admin', adminRouter);


const PORT = process.env.PORT ;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});


module.exports = app;
