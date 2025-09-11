require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Obter token de acesso
async function getAccessToken() {
  const { MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_BASE_URL } = process.env;
  const credentials = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString("base64");

  const response = await axios.post(
    `${MPESA_BASE_URL}/oauth2/v1/generate?grant_type=client_credentials`,
    {},
    { headers: { Authorization: `Basic ${credentials}` } }
  );

  return response.data.access_token;
}

// Endpoint para iniciar pagamento
app.post("/api/pay", async (req, res) => {
  try {
    const { phone, amount } = req.body;
    const token = await getAccessToken();

    const response = await axios.post(
      `${process.env.MPESA_BASE_URL}/c2bPayment/singleStage/`,
      {
        input_TransactionReference: `ECO-${Date.now()}`,
        input_CustomerMSISDN: phone, // número do cliente
        input_Amount: amount,
        input_ThirdPartyReference: "EcoTravelPay",
        input_ServiceProviderCode: process.env.MPESA_SHORTCODE
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({
      success: true,
      message: "Pagamento iniciado, confirme no telemóvel.",
      data: response.data
    });

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Erro ao iniciar pagamento.",
      error: error.response?.data || error.message
    });
  }
});

// Callback da Vodacom (recebe resultado da transação)
app.post("/api/callback", (req, res) => {
  console.log("📩 Callback recebido:", req.body);
  // Aqui podes salvar no banco de dados
  res.json({ status: "Recebido com sucesso" });
});

// Iniciar servidor
app.listen(process.env.PORT, () => {
  console.log(`🚀 Servidor a correr em http://localhost:${process.env.PORT}`);
});
