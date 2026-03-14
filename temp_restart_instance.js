const axios = require('axios');

async function main() {
  const evolutionServerUrl = 'https://evolution.vps01.nohud.com.br';
  const evolutionApiKey = 'B61399A296D14C23BC9602A9A132C79D';
  const instanceName = 'nohud-cmkv';

  console.log(`Tentando reiniciar a instância: ${instanceName}...`);

  try {
    const res = await axios.post(`${evolutionServerUrl}/instance/restart/${instanceName}`, {}, {
      headers: { 'apikey': evolutionApiKey }
    });
    console.log("Resposta do Servidor:", JSON.stringify(res.data, null, 2));
    
    if (res.data.status === 'SUCCESS' || res.data.instance?.status === 'OPENING') {
      console.log("\n✅ Comando enviado com sucesso! Aguarde alguns instantes para a instância estabilizar.");
    }

  } catch (error) {
    if (error.response?.status === 404) {
        console.error("\n❌ Erro: Instância não encontrada no servidor.");
    } else {
        console.error("\n❌ Erro ao tentar reiniciar:", error.response?.data || error.message);
        console.log("Dica: Se o erro for de conexão/rede, o servidor da Evolution pode estar instável.");
    }
  }
}

main();
