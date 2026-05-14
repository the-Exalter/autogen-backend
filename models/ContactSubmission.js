const mongoose = require('mongoose');

const contactSubmissionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true },
  is_read: { type: Boolean, default: false },
  submitted_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ContactSubmission', contactSubmissionSchema);
