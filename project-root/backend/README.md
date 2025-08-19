# WhatsApp Bulk Messaging Backend

A complete Node.js backend system for WhatsApp bulk messaging with Excel file processing, queue management, and real-time updates via Socket.IO.

## Features

- **WhatsApp Web Integration**: Uses `whatsapp-web.js` with persistent sessions
- **Excel File Processing**: Parse and validate Excel files with contact data
- **Phone Number Normalization**: Automatic formatting to E.164 (+965 Kuwait default)
- **Message Queue System**: Sequential messaging with retry logic using PQueue
- **Real-time Updates**: Socket.IO for live progress and status updates
- **Security**: CORS, Helmet, rate limiting, and file upload validation
- **Logging**: Comprehensive logging system with JSON file storage
- **Production Ready**: Configured for Railway, Render, and other platforms

## Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Setup

1. Clone and navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp env.example .env
```

4. Configure environment variables in `.env`:
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
DEFAULT_COUNTRY_CODE=965
```

## Usage

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

The server will start on port 5000 (or PORT from environment).

## API Endpoints

### REST API

- `GET /` - API information and documentation
- `GET /api/health` - Health check
- `GET /api/status` - System status (WhatsApp + messaging)
- `POST /api/upload` - Upload Excel file
- `GET /api/upload/info` - Upload requirements and format

### Socket.IO Events

#### Client → Server
- `connect_whatsapp` - Initialize WhatsApp connection
- `start_messaging` - Start bulk messaging
- `pause_messaging` - Pause messaging
- `resume_messaging` - Resume messaging  
- `cancel_messaging` - Cancel messaging
- `get_status` - Get current status
- `get_stats` - Get messaging statistics
- `get_logs` - Get message logs

#### Server → Client
- `qr` - QR code for WhatsApp authentication
- `ready` - WhatsApp is ready
- `auth_failure` - Authentication failed
- `disconnected` - WhatsApp disconnected
- `status_update` - Status updates
- `stats_update` - Statistics updates
- `message_sent` - Message sent successfully
- `message_failed` - Message failed
- `log_update` - New log entry

## Excel File Format

### Required Columns
- `name` - Customer name
- `civil_id` - Civil ID number
- `amount` - Amount to be paid
- `phone1` - Primary phone number
- `pay_link` - Payment link URL

### Optional Columns
- `phone2` - Secondary phone number
- `phone3` - Third phone number

### Message Template Variables
- `{{name}}` - Customer name
- `{{civil_id}}` - Civil ID number
- `{{amount}}` - Amount
- `{{pay_link}}` - Payment link

## Phone Number Format

The system automatically normalizes phone numbers:
- `12345678` → `+96512345678`
- `+96512345678` → `+96512345678` 
- `0096512345678` → `+96512345678`

Default country code: +965 (Kuwait)

## File Structure

```
backend/
├── src/
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Express middleware
│   ├── services/        # Business logic
│   ├── utils/          # Utility functions
│   ├── routes/         # API routes
│   └── server.js       # Main server file
├── logs/               # Log files
├── sessions/           # WhatsApp sessions
├── uploads/           # Temporary uploads
└── package.json
```

## Deployment

### Railway

1. Connect your repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on git push

### Render

1. Connect repository to Render
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Configure environment variables

### Environment Variables for Production

```env
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-frontend-domain.com
DEFAULT_COUNTRY_CODE=965
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Security Features

- **CORS**: Configured for specific domains
- **Helmet**: Security headers
- **Rate Limiting**: Prevents abuse
- **File Upload Validation**: Size and type restrictions
- **Input Sanitization**: Prevents injection attacks

## Logging

Logs are stored in `./logs/sent-log.json` with the following structure:

```json
{
  "id": "unique_id",
  "contact": {
    "name": "Customer Name",
    "civil_id": "123456789",
    "amount": "100",
    "pay_link": "https://payment.link"
  },
  "phone": "+96512345678",
  "status": "sent|failed|pending",
  "message": "Sent message text",
  "error": "Error message if failed",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Troubleshooting

### WhatsApp Connection Issues
- Ensure you have a stable internet connection
- Try clearing the `./sessions` folder and reconnecting
- Make sure WhatsApp Web is not open in other browsers

### File Upload Issues
- Check file format (Excel .xlsx, .xls, or CSV)
- Verify required columns are present
- Ensure file size is under 10MB

### Performance Issues
- Adjust message delay in environment variables
- Monitor system resources during bulk messaging
- Consider reducing batch sizes for large datasets

## Support

For issues and support:
1. Check the logs in `./logs/`
2. Verify environment configuration
3. Test with a small dataset first
4. Check WhatsApp Web status

## License

MIT License - see LICENSE file for details.
