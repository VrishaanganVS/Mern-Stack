// app.js
const express    = require('express');
const mongoose   = require('mongoose');
const bodyParser = require('body-parser');
const path       = require('path');
const bcrypt     = require('bcrypt');
const session    = require('express-session');

const app = express();

/* ------------ Middleware / Views / Static ------------ */
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'supersecretkey',            // TODO: move to ENV in production
  resave: false,
  saveUninitialized: false
}));

// make username available to all EJS templates as `username`
app.use((req, res, next) => {
  res.locals.username = req.session.username || null;
  next();
});

// Optional: simple request logger
app.use((req, _res, next) => { console.log(`[REQ] ${req.method} ${req.path}`); next(); });

/* --------------------- MongoDB ----------------------- */
// Uses DB "test" so your collection is test.users
mongoose.connect(
  'mongodb+srv://teknobot24_db_user:k0reZMyB5COAn9mf@cluster0.xhk9u9.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0',
  { useNewUrlParser: true, useUnifiedTopology: true }
).then(() => {
  console.log('✅ Connected to MongoDB Atlas');
}).catch(err => {
  console.error('❌ Error connecting to MongoDB Atlas:', err.message);
  process.exit(1);
});

/* ------------------ User Model ----------------------- */
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
  email:    { type: String, required: true, trim: true, lowercase: true, unique: true },
  password: { type: String, required: true }
}, { timestamps: true });

userSchema.index({ email: 1 }, { unique: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const User = mongoose.model('User', userSchema); // -> collection "users" in DB "test"

/* -------------------- Views -------------------------- */
app.get('/',           (req, res) => res.render('index'));   // res.locals.username available
app.get('/index.ejs',  (req, res) => res.render('index'));
app.get('/features.ejs', (req, res) => res.render('features'));
app.get('/login.ejs',  (req, res) => res.render('login'));
app.get('/menu.ejs',   (req, res) => res.render('menu'));
app.get('/signup.ejs', (req, res) => res.render('signup'));

/* ------------------- Auth Routes --------------------- */
// SIGNUP (form action="/signup")
app.post('/signup', async (req, res) => {
  try {
    let { username, email, password } = req.body;
    username = String(username || '').trim();
    email    = String(email || '').trim().toLowerCase();
    password = String(password || '');

    if (!username || !email || !password) {
      return res.redirect('/signup.ejs?error=' + encodeURIComponent('All fields are required'));
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.redirect('/signup.ejs?error=' + encodeURIComponent('Email already registered'));
    }

    await new User({ username, email, password }).save();
    return res.redirect('/login.ejs?registered=1');
  } catch (err) {
    console.error('Error creating account:', err.message);
    if (err.code === 11000) {
      return res.redirect('/signup.ejs?error=' + encodeURIComponent('Email already registered'));
    }
    return res.redirect('/signup.ejs?error=' + encodeURIComponent('Something went wrong'));
  }
});

// Back-compat: forward /register -> /signup
app.post('/register', (req, res) => res.redirect(307, '/signup'));

// LOGIN
app.post('/login', async (req, res) => {
  try {
    const email    = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    const user = await User.findOne({ email });
    if (!user) {
      return res.redirect('/login.ejs?error=' + encodeURIComponent('Invalid credentials'));
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.redirect('/login.ejs?error=' + encodeURIComponent('Invalid credentials'));
    }

    // store username in session
    req.session.username = user.username;

    return res.redirect('/index.ejs');
  } catch (err) {
    console.error('Error logging in:', err.message);
    return res.redirect('/login.ejs?error=' + encodeURIComponent('Something went wrong'));
  }
});

// LOGOUT
app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login.ejs'));
});

/* -------------------- Start -------------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));


app.use((req, res, next) => {
  res.locals.username = req.session.username || null;
  next();
});
