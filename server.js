const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');
const app = express();
const PORT = 7000;
const fs = require('fs');
const path = require('path');

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

app.post('/webhook', async (req, res) => {
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
for (const event of events) {
    if (event.type === 'message') {
        if (event.message.type === 'text') {
            if (event.message.text === '@user') {
                // Change rich menu for user
                const userId = event.source.userId;
                const richMenuId1 = process.env.RICHMENU_1; // Change to your rich menu id
                await changeRichMenuForUser(userId, richMenuId1);
            } else if (event.message.text === '@admin') {
                // Change rich menu for user
                const userId = event.source.userId;
                const richMenuId2 = process.env.RICHMENU_2; // Change to another rich menu id
                await changeRichMenuForAdmin(userId, richMenuId2);
            } else {
                // Handle other text messages
                const replyMessage = generateReplyMessage(event.message.text);
                await replyToUser(event.replyToken, replyMessage);
            }
        } else if (event.message.type === 'image') {
            // Handle image messages
            const imageId = event.message.id;
            
            const folderPath = './downloads'; // Specify the folder path where you want to save the image
            await downloadAndSaveImage(imageId, folderPath);
            const replyMessage = 'ระบบส่งออเดอร์ให้แอดมินเรียบร้อย รอรับขนมอร่อยๆได้เลยครับ';
            await replyToUser(event.replyToken, replyMessage);
        }
    }
}

  console.log(events);
  res.status(200).send('OK');
});


async function changeRichMenuForUser(userId,richMenuId1) {
  try {
      
      const url = `https://api.line.me/v2/bot/user/${userId}/richmenu/${richMenuId1}`;
      
      const response = await axios.post(url, {}, {
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
          }
      });

      console.log('Rich menu change response:', response.data);
  } catch (error) {
      console.error('Error changing rich menu:', error.response.data);
  }
}

async function changeRichMenuForAdmin(userId,richMenuId2) {
  try {
      
      const url = `https://api.line.me/v2/bot/user/${userId}/richmenu/${richMenuId2}`;
      
      const response = await axios.post(url, {}, {
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
          }
      });

      console.log('Rich menu change response:', response.data);
  } catch (error) {
      console.error('Error changing rich menu:', error.response.data);
  }
}

// Function to download and save image to specified folder
async function downloadAndSaveImage(imageId, folderPath) {
  const url = `https://api-data.line.me/v2/bot/message/${imageId}/content`;
  const imagePath = `https://5ffc-2001-44c8-4020-e3c8-1d7a-b346-cd68-4ade.ngrok-free.app/images/${imageId}.jpg`;
  try {
    const response = await axios.get(url, {
      responseType: 'stream',
      headers: {
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      }
    });

    // Create a write stream to save the image
    const writer = fs.createWriteStream(`${folderPath}/${imageId}.jpg`);

    // Pipe the image data to the writer stream
    response.data.pipe(writer);

    // Return the URL of the saved image
    return new Promise((resolve, reject) => {
      writer.on('finish', async () => {
        const imageUrl = await sendimageToNotify(imagePath); // Send the image URL to LINE Notify
        resolve(imageUrl);
      });
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
}

async function sendimageToNotify(imageUrl) {
  const notifyBody = {
    message: 'ลูกค้าโอนเงินแล้วจ้า', // ข้อความที่ต้องการแสดงก่อนภาพ
    imageThumbnail: imageUrl, // URL ของรูปภาพที่เล็กลง
    imageFullsize: imageUrl // URL ของรูปภาพขนาดเต็ม
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

  function generateReplyMessage(userMessage) {
    const lowerCaseUserMessage = userMessage.toLowerCase();
    const replies = {
      'เมนู': 'สวัสดีครับลูกค้าสามารถดูได้ที่เมนูด้านล่างได้เลยครับ',
      'ส่งกี่โมง': 'รอบส่ง 16.30 18.30 19.30 ครับ',
      'สั่งยังไง': 'ลูกค้าสามารถสั่งอาหารได้ผ่าน Richmenu เลยครับ',
      'ร้านเปิด': 'สวัสดีครับร้านเปิดให้บริการตามปกติสามารถสั่งได้ที่เมนูด้านล่างเลยครับ',
      'วันนี้ร้านปิดมั้ย': 'สวัสดีครับร้านเปิดให้บริการตามปกติสามารถสั่งได้ที่เมนูด้านล่างเลยครับ',
      'วันนี้ร้านเปิดคะ': 'สวัสดีครับร้านเปิดให้บริการตามปกติสามารถสั่งได้ที่เมนูด้านล่างเลยครับ', 
      'ส่งยัง': 'กำลังจัดส่งรอสักครู่นะครับ',
      'ครับ': 'กำลังจัดส่งรอสักครู่นะครับ',
      'รอบส่ง': 'ตอนนี้ร้านเรามีรอบส่ง 3 รอบ ได้แก่ \nรอบที่ 1 : 16.30\nรอบที่ 2 : 18.30 \nรอบที่ 3 : 19.30',
      'สวัสดี': 'สวัสดีคุณลูกค้า รับอะไรดีครับ',
  
     
    };
  
    for (const keyword in replies) {
      if (lowerCaseUserMessage.includes(keyword)) {
        return replies[keyword];
      }
    }
  
    // เงื่อนไขที่ไม่ตรงกับทั้งหมด
    return 'ลูกค้าสามารถสั่งอาหารได้ผ่าน Richmenu ได้เลยครับ';
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


// ... (your existing code)

app.post('/send-flex-message', (req, res) => {
  const { userId, flexMessage } = req.body;

  // Check if userId and flexMessage are provided in the request
  if (!userId || !flexMessage) {
    return res.status(400).json({ error: 'Invalid request format' });
  }

  // Send Flex Message to the specified user
  sendFlexMessageToUser(userId, flexMessage)
    .then(() => res.json({ success: true }))
    .catch((error) => {
      console.error('Error sending Flex Message:', error);
      res.status(500).json({ error: 'Failed to send Flex Message' });
    });
});

async function sendFlexMessageToUser(userId, flexMessage) {
  const body = {
    to: userId,
    messages: [
      {
        type: 'flex',
        altText: 'Flex Message',
        contents: flexMessage, // The Flex Message JSON object
      },
    ],
  };

  await axios.post(
    `${LINE_BOT_API}/message/push`,
    body,
    { headers }
  );

  
}

app.use('/images', express.static(path.join(__dirname, 'downloads')));

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
