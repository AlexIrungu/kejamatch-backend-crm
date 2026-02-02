import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Don't include password by default in queries
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name must not exceed 100 characters']
  },
  role: {
    type: String,
    enum: ['admin', 'agent'],
    default: 'agent',
    required: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  verificationCode: {
    type: String,
    default: null,
    select: false
  },
  verificationCodeExpiry: {
    type: Date,
    default: null,
    select: false
  },
  verificationAttempts: {
    type: Number,
    default: 0,
    select: false
  },
  lastLogin: {
    type: Date,
    default: null
  },
  // Additional agent-specific fields
  phone: {
    type: String,
    default: null,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  department: {
    type: String,
    default: null
  },
  // Tracking
  loginCount: {
    type: Number,
    default: 0
  },
  lastPasswordChange: {
    type: Date,
    default: null
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.verificationCode;
      delete ret.verificationCodeExpiry;
      delete ret.verificationAttempts;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Virtual for id (maps _id to id for consistency)
userSchema.virtual('id').get(function() {
  return this._id.toString();
});

// Indexes for better query performance
userSchema.index({ email: 1, isActive: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ isVerified: 1, createdAt: -1 });

// Hash password before saving
// Hash password before saving
userSchema.pre('save', async function() {
  // Only hash if password is modified or new
  if (!this.isModified('password')) {
    return;
  }

  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  this.lastPasswordChange = new Date();
});
// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    // Need to explicitly select password since it's excluded by default
    const user = await this.constructor.findById(this._id).select('+password');
    if (!user || !user.password) {
      return false;
    }
    return await bcrypt.compare(candidatePassword, user.password);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
};

// Generate 6-digit verification code
userSchema.methods.generateVerificationCode = function() {
  this.verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  this.verificationCodeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  this.verificationAttempts = 0;
  return this.verificationCode;
};

// Verify the code
userSchema.methods.verifyCode = function(code) {
  if (!this.verificationCode || !this.verificationCodeExpiry) {
    return { valid: false, error: 'No verification code found' };
  }

  if (new Date() > new Date(this.verificationCodeExpiry)) {
    return { valid: false, error: 'Verification code has expired' };
  }

  if (this.verificationAttempts >= 5) {
    return { valid: false, error: 'Too many attempts. Please request a new code.' };
  }

  this.verificationAttempts++;

  if (this.verificationCode !== code) {
    return { valid: false, error: 'Invalid verification code' };
  }

  // Code is valid - mark as verified
  this.isVerified = true;
  this.verificationCode = null;
  this.verificationCodeExpiry = null;
  this.verificationAttempts = 0;

  return { valid: true };
};

// Update last login
userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  this.loginCount = (this.loginCount || 0) + 1;
  await this.save();
};

// Get safe user data (without sensitive fields)
userSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.verificationCode;
  delete obj.verificationCodeExpiry;
  delete obj.verificationAttempts;
  delete obj.__v;
  return obj;
};

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to create default admin
userSchema.statics.createDefaultAdmin = async function() {
  const adminExists = await this.findOne({ role: 'admin' });
  
  if (adminExists) {
    console.log('✅ Default admin already exists');
    return adminExists;
  }

  const defaultAdmin = await this.create({
    email: 'admin@kejamatch.com',
    password: 'Admin@123',
    name: 'Admin User',
    role: 'admin',
    isActive: true,
    isVerified: true
  });

  console.log('✅ Default admin created:');
  console.log('   Email: admin@kejamatch.com');
  console.log('   Password: Admin@123');
  console.log('   ⚠️  PLEASE CHANGE THIS PASSWORD IMMEDIATELY!');

  return defaultAdmin;
};

const User = mongoose.model('User', userSchema);

export default User;