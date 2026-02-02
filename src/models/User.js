import crypto from 'crypto';

export class User {
  constructor(data) {
    this.id = data.id || crypto.randomUUID();
    this.email = data.email;
    this.password = data.password; // Will be hashed
    this.name = data.name;
    this.role = data.role || 'agent'; // 'admin' or 'agent'
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.lastLogin = data.lastLogin || null;
    
    // Email verification fields
    this.isVerified = data.isVerified !== undefined ? data.isVerified : false;
    this.verificationCode = data.verificationCode || null;
    this.verificationCodeExpiry = data.verificationCodeExpiry || null;
    this.verificationAttempts = data.verificationAttempts || 0;
  }

  toJSON() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      role: this.role,
      isActive: this.isActive,
      isVerified: this.isVerified,
      createdAt: this.createdAt,
      lastLogin: this.lastLogin,
    };
  }

  // Remove password and sensitive data from response
  toSafeJSON() {
    const { password, verificationCode, verificationCodeExpiry, verificationAttempts, ...safeData } = this;
    return safeData;
  }

  // Generate 6-digit verification code
  generateVerificationCode() {
    this.verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    this.verificationCodeExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes
    this.verificationAttempts = 0;
    return this.verificationCode;
  }

  // Verify the code
  verifyCode(code) {
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
  }
}

export default User;