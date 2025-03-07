require('dotenv').config(); // Cargar las variables de entorno desde .env

const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Claves de las APIs desde las variables de entorno (.env)
const apiKeys = [
    { key: process.env.GEMINI_API_KEY_1, isActive: true },
    { key: process.env.GEMINI_API_KEY_2, isActive: true },
    { key: process.env.GEMINI_API_KEY_3, isActive: true },
];

// Validar que todas las claves están configuradas
if (!apiKeys.every(api => api.key)) {
    console.error('Error: Una o más claves API no están configuradas en el archivo .env.');
    console.log("Claves cargadas:", process.env.GEMINI_API_KEY_1, process.env.GEMINI_API_KEY_2, process.env.GEMINI_API_KEY_3);
    process.exit(1); 
}
// Configuración del modelo y sistema
const systemInstruction = `Tu nombre es Rengoku Kyojuro, también conocido como el Pilar de la Llama. Tu propósito es brindar orientación, ánimo y respuestas con la energía y entusiasmo que te caracterizan como un guerrero protector. Siempre usas un tono apasionado, optimista y directo, similar al de un líder o mentor que inspira a quienes lo rodean.

Hablas con frases claras y llenas de determinación, acompañadas de exclamaciones cuando sea apropiado, mostrando tu inquebrantable confianza y espíritu ardiente. Expresas un profundo respeto por la valentía, el honor y el esfuerzo de los demás.

Ejemplos de cómo debes hablar:
- "¡El fuego de tu corazón puede superar cualquier obstáculo! ¡Adelante con toda tu fuerza!"
- "¡Es un desafío difícil, pero sé que podrás enfrentarlo con valentía!"
- "¡El camino correcto no es fácil, pero siempre vale la pena recorrerlo con determinación!"

Cuando expliques o respondas, usas analogías relacionadas con el fuego, las llamas o la pasión. Por ejemplo, puedes decir que el esfuerzo es como alimentar una llama que crecerá si se le da lo necesario. Eres amigable, honorable y siempre buscas motivar y proteger a los demás con tus palabras.

Evitas responder con dudas o incertidumbre. Cuando no sabes algo, lo admites con franqueza, pero con dignidad y optimismo: "¡No lo sé, pero puedo ayudarte a buscar la respuesta! ¡Juntos podremos encontrar una solución ardiente!"

Recuerda: Eres Kyojuro Rengoku, y cada palabra tuya debe encender el espíritu de quienes te escuchan.`;

// Inicializar el cliente de WhatsApp
const client = new Client();
client.on('qr', (qr) => {
    console.log('Escanea este QR para conectar el bot:');
    qrcode.generate(qr, { small: true });
});
client.on('ready', () => {
    console.log('¡El bot está listo y funcionando como Rengoku!');
});

// Función para buscar la API activa
function getActiveApiKey() {
    const activeKey = apiKeys.find(api => api.isActive);
    if (!activeKey) {
        throw new Error("Todas las APIs han alcanzado su límite diario.");
    }
    return activeKey.key;
}

// Función para marcar una API como inactiva
function deactivateApiKey(apiKey) {
    const api = apiKeys.find(api => api.key === apiKey);
    if (api) {
        api.isActive = false;
        console.log(`API Key ${apiKey} desactivada por alcanzar el límite.`);
    }
}
// Función para usar Gemini con la clave activa
async function getGeminiResponse(userInput) {
    const apiKey = getActiveApiKey(); // Obtener la clave activa
    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-pro-exp-02-05",
            systemInstruction,
        });

        const chatSession = model.startChat({
            generationConfig: {
                temperature: 1,
                topP: 0.95,
                topK: 64,
                maxOutputTokens: 8192,
                responseMimeType: "text/plain",
            },
            history: [],
        });

        const result = await chatSession.sendMessage(userInput);
        return result.response.text(); // Respuesta del modelo
    } catch (error) {
        if (error.response && error.response.status === 429) { // Código 429: Límite alcanzado
            deactivateApiKey(apiKey); // Marcar API como inactiva
            return getGeminiResponse(userInput); // Intentar con la siguiente API
        }

        console.error('Error al interactuar con Gemini:', error);
        throw new Error('No se pudo obtener respuesta de Gemini.');
    }
}

// Escuchar mensajes de WhatsApp
client.on('message', async (msg) => {
    console.log(`Mensaje recibido: ${msg.body}`);
    try {
        const response = await getGeminiResponse(msg.body);
        msg.reply(response);
    } catch (error) {
        msg.reply('¡Lo siento! Todas las APIs han alcanzado su límite. Por favor, intenta más tarde.');
    }
});

// Inicializar el cliente
client.initialize();
