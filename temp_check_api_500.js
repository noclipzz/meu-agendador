const axios = require('axios');

async function testApi() {
  try {
    // We can't easily bypass Clerk auth, but maybe the 500 is happening BEFORE auth? No, line 15 checked userId.
    // Let's check if the URL is correct.
    const url = 'https://www.nohud.com.br/api/painel/financeiro?month=3&year=2026';
    const res = await axios.get(url);
    console.log("Status:", res.status);
  } catch (error) {
    console.log("Status:", error.response?.status);
    console.log("Data:", error.response?.data);
  }
}

testApi();
