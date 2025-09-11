require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ==========================
// Função para gerar token (corrigida)
// ==========================
async function getAccessToken() {
  const { MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_BASE_URL } = process.env;
  const credentials = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString("base64");

  try {
    const response = await axios.get(
      `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${credentials}` } }
    );
    return response.data.access_token;
  } catch (error) {
    console.error("❌ Erro ao gerar token:", error.response?.data || error.message);
    throw error;
  }
}

// ==========================
// Gerar password do STK Push sem moment
// ==========================
function generatePassword() {
  const pad = (n) => n.toString().padStart(2, "0");
  const d = new Date();
  const timestamp = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const password = Buffer.from(
    process.env.MPESA_SHORTCODE + process.env.MPESA_PASSKEY + timestamp
  ).toString("base64");
  return { password, timestamp };
}

// ==========================
// Endpoint STK Push
// ==========================
app.post("/api/pay", async (req, res) => {
  try {
    const { phone, amount } = req.body;
    console.log("📥 Pedido recebido:", req.body);

    const token = await getAccessToken();
    console.log("🔑 Token:", token);

    const { password, timestamp } = generatePassword();

    const payload = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phone,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: process.env.CALLBACK_URL,
      AccountReference: `ECO-${Date.now()}`,
      TransactionDesc: "Pagamento EcoTravel Sandbox"
    };

    const response = await axios.post(
      `${process.env.MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ Resposta STK Push:", response.data);

    res.json({
      success: true,
      message: "STK Push iniciado! Confirma no telemóvel.",
      data: response.data
    });

  } catch (error) {
    console.error("❌ Erro STK Push:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Erro ao iniciar STK Push",
      error: error.response?.data || error.message
    });
  }
});

// ==========================
// Callback
// ==========================
app.post("/api/callback", (req, res) => {
  console.log("📩 Callback recebido:", req.body);
  res.json({ status: "Recebido com sucesso" });
});

// ==========================
// Iniciar servidor
// ==========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor a correr em http://localhost:${PORT}`));
