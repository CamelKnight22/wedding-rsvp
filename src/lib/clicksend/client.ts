import axios from "axios";
import { formatAUPhone } from "@/lib/utils/phone";

const CLICKSEND_API_URL = "https://rest.clicksend.com/v3";

// Create authenticated axios client
function getClient() {
  const username = process.env.CLICKSEND_USERNAME;
  const apiKey = process.env.CLICKSEND_API_KEY;

  console.log(
    "ClickSend username:",
    username ? `${username.substring(0, 3)}...` : "NOT SET",
  );
  console.log(
    "ClickSend API key:",
    apiKey ? `${apiKey.substring(0, 5)}...` : "NOT SET",
  );

  if (!username || !apiKey) {
    throw new Error("ClickSend credentials not configured");
  }

  const auth = Buffer.from(`${username}:${apiKey}`).toString("base64");

  return axios.create({
    baseURL: CLICKSEND_API_URL,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
  });
}

export interface MMSMessage {
  to: string;
  body: string;
  mediaUrl: string;
  subject?: string;
}

export interface SMSMessage {
  to: string;
  body: string;
}

export interface SendResult {
  success: boolean;
  to: string;
  messageId?: string;
  error?: string;
}

// Send single MMS
export async function sendMMS({
  to,
  body,
  mediaUrl,
  subject = "",
}: MMSMessage): Promise<SendResult> {
  try {
    const client = getClient();
    const formattedPhone = formatAUPhone(to);

    const requestBody = {
      media_file: mediaUrl,
      messages: [
        {
          to: formattedPhone,
          body,
          subject,
        },
      ],
    };

    console.log("ClickSend MMS request:", JSON.stringify(requestBody, null, 2));

    const response = await client.post("/mms/send", requestBody);

    console.log(
      "ClickSend MMS response:",
      JSON.stringify(response.data, null, 2),
    );

    const messageId = response.data?.data?.messages?.[0]?.message_id;

    return {
      success: true,
      to,
      messageId,
    };
  } catch (error: any) {
    console.log("ClickSend error status:", error.response?.status);
    console.log(
      "ClickSend error data:",
      JSON.stringify(error.response?.data, null, 2),
    );
    console.log("ClickSend error message:", error.message);

    const errorMessage =
      error.response?.data?.response_msg ||
      error.response?.data?.message ||
      error.message;

    return {
      success: false,
      to,
      error: errorMessage,
    };
  }
}

// Send bulk MMS (sends one at a time since each may have different media)
export async function sendBulkMMS(
  messages: MMSMessage[],
): Promise<SendResult[]> {
  const results: SendResult[] = [];

  for (const msg of messages) {
    const result = await sendMMS(msg);
    results.push(result);

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return results;
}

// Send single SMS
export async function sendSMS({ to, body }: SMSMessage): Promise<SendResult> {
  try {
    const client = getClient();
    const formattedPhone = formatAUPhone(to);

    const requestBody = {
      messages: [
        {
          to: formattedPhone,
          body,
          from: "Wedding",
        },
      ],
    };

    console.log("ClickSend SMS request:", JSON.stringify(requestBody, null, 2));

    const response = await client.post("/sms/send", requestBody);

    console.log(
      "ClickSend SMS response:",
      JSON.stringify(response.data, null, 2),
    );

    const messageId = response.data?.data?.messages?.[0]?.message_id;

    return {
      success: true,
      to,
      messageId,
    };
  } catch (error: any) {
    console.log("ClickSend SMS error:", error.response?.data || error.message);

    const errorMessage =
      error.response?.data?.response_msg ||
      error.response?.data?.message ||
      error.message;

    return {
      success: false,
      to,
      error: errorMessage,
    };
  }
}

// Send bulk SMS
export async function sendBulkSMS(
  messages: SMSMessage[],
): Promise<SendResult[]> {
  try {
    const client = getClient();

    const formattedMessages = messages.map((msg) => ({
      to: formatAUPhone(msg.to),
      body: msg.body,
      from: "Wedding",
    }));

    const response = await client.post("/sms/send", {
      messages: formattedMessages,
    });

    return messages.map((msg, index) => ({
      success: true,
      to: msg.to,
      messageId: response.data?.data?.messages?.[index]?.message_id,
    }));
  } catch (error: any) {
    console.log(
      "ClickSend bulk SMS error:",
      error.response?.data || error.message,
    );

    return messages.map((msg) => ({
      success: false,
      to: msg.to,
      error: error.response?.data?.response_msg || error.message,
    }));
  }
}

// Check account balance
export async function getAccountBalance(): Promise<{
  balance: number;
  currency: string;
} | null> {
  try {
    const client = getClient();
    const response = await client.get("/account");

    return {
      balance: response.data?.data?.balance || 0,
      currency: response.data?.data?.currency_symbol || "AUD",
    };
  } catch (error) {
    console.log("ClickSend balance error:", error);
    return null;
  }
}
