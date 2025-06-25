// netlify/functions/proxy.mjs

// Importation dynamique de node-fetch, nécessaire pour les modules ES
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


export const handler = async (event) => {
    const DEMANDS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_DEMANDS_URL || 'https://script.google.com/macros/s/AKfycbzY3tDLyDk_zrl6QV-v79Wt9Y-LDei5QltF0b2g869ahUQrEuXFhblO3YV4d_qKeKQ8/exec';

    try {
        const action = event.queryStringParameters?.action;

        let targetUrl = '';
        let fetchMethod = event.httpMethod;
        let requestBody = null;

        if (!action) {
            console.warn(`Proxy.mjs: Action manquante.`);
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Action non reconnue ou manquante.", actionReçue: "Aucune" }),
            };
        }

        switch (action) {
            case 'getProfils':
                targetUrl = `https://${event.headers.host}/.netlify/functions/getProfils`;
                requestBody = null;
                break;

            case 'getDemandesIA':
                targetUrl = DEMANDS_SCRIPT_URL + '?action=' + action;
                fetchMethod = 'GET';
                requestBody = null;
                break;

            case 'updateProfil':
                targetUrl = `https://${event.headers.host}/.netlify/functions/updateProfil`;
                requestBody = event.body;
                break;

            case 'deleteProfil':
                targetUrl = `https://${event.headers.host}/.netlify/functions/deleteProfil`;
                fetchMethod = 'DELETE';
                requestBody = event.body;
                break;

            case 'getGalleryPrompts':
                targetUrl = `https://${event.headers.host}/.netlify/functions/getGalleryPrompts`;
                requestBody = null;
                break;

            case 'saveTip':
                targetUrl = `https://${event.headers.host}/.netlify/functions/saveTip`;
                requestBody = event.body;
                break;

            case 'getSharedTips':
                targetUrl = `https://${event.headers.host}/.netlify/functions/getSharedTips`;
                requestBody = null;
                break;

            case 'chatWithGPT':
                try {
                    const { message } = JSON.parse(event.body);

                    if (!message) {
                        return {
                            statusCode: 400,
                            body: JSON.stringify({ reply: "Message vide." }),
                        };
                    }

                    const completion = await openai.chat.completions.create({
                        model: "gpt-4o", // <-- CHANGEZ CETTE LIGNE
                        messages: [{ role: "user", content: message }],
                        max_tokens: 300,
                        temperature: 0.7,
                    });

                    const reply = completion.choices[0].message.content;

                    return {
                        statusCode: 200,
                        body: JSON.stringify({ reply: reply }),
                    };
                } catch (chatError) {
                    console.error("Erreur lors de l'appel à l'API GPT :", chatError);
                    return {
                        statusCode: 500,
                        body: JSON.stringify({ reply: `Désolé, une erreur est survenue lors de la communication avec l'IA: ${chatError.message}` }),
                    };
                }

            default:
                console.warn(`Proxy.mjs: Action non reconnue: ${action}`);
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: "Action non reconnue ou manquante.", actionReçue: action }),
                };
        }

        const fetchOptions = {
            method: fetchMethod,
            headers: {},
        };

        if (requestBody && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(fetchMethod.toUpperCase())) {
            fetchOptions.headers["Content-Type"] = "application/json";
            fetchOptions.body = requestBody;
        }

        console.log("Proxy.mjs envoie vers :", targetUrl);
        console.log("Options fetch :", { ...fetchOptions, body: fetchOptions.body ? '[body present]' : '[no body]' });

        const response = await fetch(targetUrl, fetchOptions);

        const contentType = response.headers.get("content-type") || "";
        const isJSON = contentType.includes("application/json");
        const body = isJSON ? await response.json() : await response.text();

        console.log("Proxy.mjs reçoit :", body);

        return {
            statusCode: response.status,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Content-Type": isJSON ? "application/json" : "text/plain",
            },
            body: isJSON ? JSON.stringify(body) : body,
        };

    } catch (error) {
        console.error("Erreur dans proxy.mjs :", error);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: `Erreur interne du proxy : ${error.message}` }),
        };
    }
};
