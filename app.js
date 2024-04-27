const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect('mongodb+srv://teknobot24:Vrishaangan@project-0.1qaztmt.mongodb.net/?retryWrites=true&w=majority&appName=Project-0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB Atlas');
}).catch((err) => {
  console.error('Error connecting to MongoDB Atlas:', err.message);
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true }
});

userSchema.pre('save', async function(next) {
  const user = this;
  if (!user.isModified('password')) return next();
  const hashedPassword = await bcrypt.hash(user.password, 10);
  user.password = hashedPassword;
  next();
});

const User = mongoose.model('User', userSchema);

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/index.ejs', (req, res) => {
  res.render('index');
});

app.get('/features.ejs', (req, res) => {
  res.render('features');
});

app.get("/login.ejs", (req, res) => {
  res.render('login');
});

app.get("/menu.ejs", (req, res) => {
  res.render('menu');
});

app.get("/signup.ejs", (req, res) => {
  res.render('signup');
});

app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send('Email already registered');
    }
    const newUser = new User({ username, email, password });
    await newUser.save();
    res.send('Account created successfully');
  } catch (err) {
    console.error('Error creating account:', err.message);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).send('Invalid credentials');
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).send('Invalid credentials');
    }
    res.redirect('/index.ejs');
  } catch (err) {
    console.error('Error logging in:', err.message);
    res.status(500).send('Internal Server Error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
