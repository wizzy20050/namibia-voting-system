const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB connection (replace <your_connection_string> with real URI)
const mongoUri = 'mongodb://localhost:27017/voting_system';
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Schemas
const voterSchema = new mongoose.Schema({
  surname: String,
  name: String,
  id_number: { type: String, unique: true },
  region: String,
  constituency: String,
  gender: String,
  vrn: { type: String, unique: true },
  // For demo, store credential id from biometric registration
  credentialId: String,
  hasVoted: { type: Boolean, default: false },
});

const voteSchema = new mongoose.Schema({
  id_number: String,
  candidate: String,
  timestamp: { type: Date, default: Date.now }
});

const Voter = mongoose.model('Voter', voterSchema);
const Vote = mongoose.model('Vote', voteSchema);

// Routes

// Register voter
app.post('/register', async (req, res) => {
  try {
    const { surname, name, id_number, region, constituency, gender, vrn, credentialId } = req.body;
    if (!surname || !name || !id_number || !region || !constituency || !gender || !vrn || !credentialId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if already registered
    const exists = await Voter.findOne({ $or: [ {id_number}, {vrn} ] });
    if (exists) {
      return res.status(400).json({ message: 'ID number or VRN already registered' });
    }

    const voter = new Voter({ surname, name, id_number, region, constituency, gender, vrn, credentialId });
    await voter.save();
    res.json({ message: 'Registration successful' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login voter
app.post('/login', async (req, res) => {
  try {
    const { id_number, vrn } = req.body;
    if (!id_number || !vrn) {
      return res.status(400).json({ message: 'Missing ID number or VRN' });
    }
    const voter = await Voter.findOne({ id_number, vrn });
    if (!voter) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    res.json({ message: 'Login successful', voterId: voter._id, credentialId: voter.credentialId });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Submit vote
app.post('/vote', async (req, res) => {
  try {
    const { id_number, candidate } = req.body;
    if (!id_number || !candidate) {
      return res.status(400).json({ message: 'Missing voter ID number or candidate' });
    }
    const voter = await Voter.findOne({ id_number });
    if (!voter) {
      return res.status(401).json({ message: 'Voter not found' });
    }
    if (voter.hasVoted) {
      return res.status(403).json({ message: 'You have already voted' });
    }
    const vote = new Vote({ id_number, candidate });
    await vote.save();
    voter.hasVoted = true;
    await voter.save();
    res.json({ message: 'Vote recorded successfully' });
  } catch (error) {
    console.error('Voting error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// For biometric verification step, the frontend does WebAuthn calls directly; backend can return credentialId on login.

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

