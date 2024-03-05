const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');
const app = express();
const PORT = 8888;

app.use(cors());
app.use(bodyParser.json());

// Load environment variables from .env file
require('dotenv').config();
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_CHANNEL_SECRET = process.env.LINE_SECRET_CODE;
const LINE_NOTIFY_TOKEN = process.env.LINE_NOTIFY_TOKEN;

const LINE_BOT_API = 'https://api.line.me/v2/bot';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
};

app.post('/webhook', (req, res) => {
    const signature = req.get('X-Line-Signature');
  
    if (!signature) {
      return res.status(400).send('Signature not provided');
    }
  
    // Validate the request signature
    if (!validateSignature(req.body, LINE_CHANNEL_SECRET, signature)) {
      return res.status(401).send('Invalid signature');
    }
  
    // Process the events
    const events = req.body.events;
    events.forEach(async (event) => {
      if (event.type === 'message' && event.message.type === 'text') {
        // Handle text messages
        const replyMessage = generateReplyMessage(event.message.text);
        await replyToUser(event.replyToken, replyMessage);
      }
    });
  
    res.status(200).send('OK');
  });
  

  function generateReplyMessage(userMessage) {
    // แปลงข้อความผู้ใช้เป็นตัวหนังสือเล็กเพื่อทำการเปรียบเทียบ
    const lowerCaseUserMessage = userMessage.toLowerCase();
  
    // เงื่อนไขสำหรับการตอบกลับ
    if (lowerCaseUserMessage.includes('สวัสดีครับ')) {
      return 'สวัสดีตอนเช้า';
    } else if (lowerCaseUserMessage.includes('ทำไร')) {
      return 'กำลังทำงานนะ';
    } else if (lowerCaseUserMessage.includes('คุณชื่อ')) {
      return 'ฉันคือบอทแชท';
    } else if (lowerCaseUserMessage.includes('สั่งซื้อสินค้าจ้า')) {
      return 'QR CODE';
    } else if (lowerCaseUserMessage.includes('คุณชื่อ')) {
      return 'ฉันคือบอทแชท';
    } else if (lowerCaseUserMessage.includes('คุณชื่อ')) {
      return 'ฉันคือบอทแชท';
    } 
    
    else {
      // เงื่อนไขที่ไม่ตรงกับทั้งหมด
      return 'ข้อความตอบกลับที่คุณต้องการ';
    }
  }


function validateSignature(body, channelSecret, signature) {
  const crypto = require('crypto');
  const hash = crypto.createHmac('sha256', channelSecret).update(JSON.stringify(body)).digest('base64');
  return hash === signature;
}

async function replyToUser(replyToken, message) {
  const body = {
    replyToken,
    messages: [
      {
        type: 'text',
        text: message,
      },
    ],
  };

  await axios.post(
    `${LINE_BOT_API}/message/reply`,
    body,
    { headers }
  );
}

async function sendtoUser(userId, message) {
  const body = {
    to: userId,  // เปลี่ยนจาก userId เป็น to
    messages: [   // เปลี่ยนจาก message เป็น messages
      {
        type: 'text',
        text: message,
      },
    ],
  };


  await axios.post(
    `${LINE_BOT_API}/message/push`,
    body,
    { headers }
  );

  await sendToNotify(message);
}

async function sendToNotify(message) {
  

  const notifyBody = {
    message,
  };

  await axios.post(
    'https://notify-api.line.me/api/notify',
    notifyBody,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${LINE_NOTIFY_TOKEN}`,
      },
    }
  );
}


app.post('/send-message', (req, res) => {
  const { userId, message } = req.body;

  // ตรวจสอบว่ามีข้อมูลที่จำเป็นใน request หรือไม่
  if (!userId || !message) {
    return res.status(400).json({ error: 'Invalid request format' });
  }

  // ส่งข้อความไปยังผู้ใช้
  sendtoUser(userId, message)
    .then(() => res.json({ success: true }))
    .catch((error) => {
      console.error('Error sending message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    });
});



app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
