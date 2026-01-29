/**
 * Odoo CRM Configuration
 */

export const odooConfig = {
  // Odoo Server Details
  url: process.env.ODOO_URL || 'https://crm.kejamatch.com',
  database: process.env.ODOO_DB || 'kejamatch_crm',
  username: process.env.ODOO_USERNAME,
  password: process.env.ODOO_PASSWORD,
  
  // API Configuration
  apiTimeout: 10000, // 10 seconds
  retryAttempts: 3,
  retryDelay: 1000, // milliseconds
  
  // Default CRM Settings
  defaults: {
    source: 'Website',
    stage: 'New Lead',
    type: 'lead',
  },
  
  // Kenyan Counties for Custom Field
  counties: [
    'Nairobi',
    'Kiambu',
    'Machakos',
    'Kajiado',
    'Nakuru',
    'Mombasa',
    'Kisumu',
    'Eldoret',
    'Other'
  ],
  
  // Budget Ranges for Custom Field
  budgetRanges: [
    '0-5m',
    '5-10m',
    '10-20m',
    '20-50m',
    '50m+'
  ],
};

export default odooConfig;