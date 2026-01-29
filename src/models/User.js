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
  }

  toJSON() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      role: this.role,
      isActive: this.isActive,
      createdAt: this.createdAt,
      lastLogin: this.lastLogin,
    };
  }

  // Remove password from response
  toSafeJSON() {
    const { password, ...safeData } = this;
    return safeData;
  }
}

export default User;