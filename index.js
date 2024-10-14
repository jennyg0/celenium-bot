require("dotenv").config();
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const CELENIUM_API_MAINNET_BASE_URL = process.env.CELENIUM_API_MAINNET_BASE_URL;

/**
 * Function to fetch blob data for a given transaction hash
 * @param {string} txHash - The transaction hash
 * @returns {Array} - Array of blob objects or null if an error occurs
 */
const fetchBlobsByTxHash = async (txHash) => {
  try {
    const response = await axios.get(
      `${CELENIUM_API_MAINNET_BASE_URL}/v1/tx/${txHash}/blobs`
    );
    return response.data;
  } catch (error) {
    console.error(
      `Error fetching blobs for TX Hash "${txHash}":`,
      error.message
    );
    return null;
  }
};

/**
 * Function to format blob data into a readable message
 * @param {Array} blobs - Array of blob objects
 * @returns {string} - Formatted message
 */
const formatBlobsMessage = (blobs) => {
  if (!blobs || blobs.length === 0) {
    return "No blobs found for the provided transaction hash.";
  }

  const time = new Date(blobs[0].tx.time).toLocaleString();
  const blockHeight = blobs[0].height;
  const namespace = blobs[0].namespace.name;

  let message = `• *Time:* \`${time}\`\n`;
  message += `• *Block Height:* \`${blockHeight}\`\n`;
  message += `• *Namespace:* \`${namespace}\`\n\n`;

  blobs.forEach((blob, index) => {
    message += `*Blob ${index + 1}:*\n`;
    message += `• *Blob ID:* \`${blob.id}\`\n`;
    message += `• *Size:* \`${blob.size} bytes\`\n`;
    message += `• *Content Type:* \`${blob.content_type}\`\n`;
    message += `• *Status:* \`${blob.tx.status}\`\n\n`;
  });

  return message;
};

// handle the /tx command in telegram
bot.onText(/\/tx (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const txHash = match[1].trim();

  if (!txHash) {
    bot.sendMessage(
      chatId,
      "Please provide a valid transaction hash. Usage: /tx {hash}",
      { parse_mode: "Markdown" }
    );
    return;
  }

  bot.sendMessage(
    chatId,
    `Fetching blobs for transaction hash: \`${txHash}\`...`,
    { parse_mode: "Markdown" }
  );

  const blobs = await fetchBlobsByTxHash(txHash);

  if (blobs === null) {
    bot.sendMessage(
      chatId,
      "An error occurred while fetching blob data. Please ensure the transaction hash is correct and try again later.",
      { parse_mode: "Markdown" }
    );
    return;
  }

  const formattedMessage = formatBlobsMessage(blobs);

  bot.sendMessage(chatId, formattedMessage, { parse_mode: "Markdown" });
});

// handle the /start command in telegram
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = `Welcome to the *Celenium Transaction Bot*!

Use the following command to retrieve blob information for a specific transaction:

• \`/tx {transaction_hash}\`

*Example:*
\`\`\`
/tx 733b59e017f3097ac7d992f788753dbbaf07ac95a597a191402d789828278138
\`\`\`
`;

  bot.sendMessage(chatId, welcomeMessage, { parse_mode: "Markdown" });
});
