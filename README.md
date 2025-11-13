# Kejamatch Backend API

Backend API for Kejamatch Real Estate platform handling booking and contact form submissions.

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- Resend API account

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd kejamatch-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
```bash
cp .env.example .env
```

Edit `.env` and add your configuration:
- `RESEND_API_KEY` - Your Resend API key
- `FROM_EMAIL` - noreply@kejamatch.com
- `ADMIN_EMAIL` - info@kejamatch.com
- `FRONTEND_URL` - https://kejamatch.com

4. **Run the server**
```bash
# Development
npm run dev

# Production
npm start
```

Server will run on `http://localhost:5000`

## 📡 API Endpoints

### POST /api/bookings
Handle BNB booking submissions

**Request Body:**
```json
{
  "propertyName": "Luxury Villa",
  "propertyLocation": "Nairobi",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+254712345678",
  "checkIn": "2024-12-01",
  "checkOut": "2024-12-05",
  "guests": 2,
  "nights": 4,
  "pricePerNight": 15000,
  "totalCost": 60000,
  "specialRequests": "Late check-in"
}
```

### POST /api/contact
Handle contact form submissions

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phoneNumber": "+254712345678",
  "subject": "Property Inquiry",
  "message": "I'm interested in..."
}
```

## 🔒 Security Features

- CORS protection (only allows kejamatch.com)
- Rate limiting (10 requests per 15 minutes per IP)
- Input validation and sanitization
- Helmet.js security headers
- Email validation

## 📧 Email Templates

- **Booking Admin Notification** - Sent to info@kejamatch.com
- **Booking User Confirmation** - Sent to customer
- **Contact Admin Notification** - Sent to info@kejamatch.com
- **Contact User Confirmation** - Sent to customer

## 🚢 Deployment (Render)

1. Push code to GitHub
2. Connect repository to Render
3. Add environment variables in Render dashboard
4. Deploy!

## 📝 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| NODE_ENV | Environment | production |
| RESEND_API_KEY | Resend API key | re_xxx |
| FROM_EMAIL | Sender email | noreply@kejamatch.com |
| ADMIN_EMAIL | Admin email | info@kejamatch.com |
| FRONTEND_URL | Frontend URL | https://kejamatch.com |

## 🛠️ Tech Stack

- Express.js
- Resend (Email service)
- Express Validator
- Express Rate Limit
- Helmet.js
- CORS

## 📞 Support

For issues or questions, contact: info@kejamatch.com