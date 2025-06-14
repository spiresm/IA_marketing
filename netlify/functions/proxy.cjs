const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

export const handler = async (event) => {
  const DEMANDS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_DEMANDS_URL || 'https://script.google.com/macros/s/AKfycbyoDFofm25-QcQdli_bx4Odkl-xDw7501CbadTf3k85dWPx_gTq_oPVuHo7s3Mk7Q/exec';

  try {
    let action = event.queryStringParameters?.action;
    let requestBody = {}; 

    if (event.httpMethod === "POST" && event.body) {
      try {
        requestBody = JSON.parse(event.body);
        if (requestBody.action) {
          action = requestBody.action;
        }
      } catch (parseError) {
        console.error("Erreur de parsing JSON du corps de la requête POST :", parseError);
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Corps de la requête JSON invalide." }),
        };
      }
    }

    let targetUrl = '';
    let fetchMethod = event.httpMethod;
    let fetchBody = event.body; 
    let isLocalFunctionCall = false;

    switch (action) {
      case 'getProfils':
        targetUrl = '/.netlify/functions/getProfils';
        isLocalFunctionCall = true;
        break;

      case 'getDemandesIA':
        targetUrl = DEMANDS_SCRIPT_URL + '?action=' + action;
        break;

      case 'updateProfil':
        targetUrl = '/.netlify/functions/updateProfil';
        isLocalFunctionCall = true;
        break;
        
      case 'deleteDemande':
        targetUrl = DEMANDS_SCRIPT_URL + '?action=' + action;
        fetchMethod = 'POST';
        fetchBody = JSON.stringify(requestBody);
        break;
        
      case 'updateDemandeIA':
        targetUrl = DEMANDS_SCRIPT_URL + '?action=' + action;
        fetchMethod = 'POST';
        fetchBody = JSON.stringify(requestBody);
        break;

      case 'sendRequest': 
        targetUrl = DEMANDS_SCRIPT_URL + '?action=' + action;
        fetchMethod = 'POST';
        fetchBody = JSON.stringify(requestBody);
        break;

      default:
        console.warn(`Proxy.cjs: Action non reconnue: ${action}`);
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Action non reconnue ou manquante." }),
        };
    }

    const fullTargetUrl = isLocalFunctionCall ? new URL(targetUrl, `https://${event.headers.host}`).toString() : targetUrl;

    const fetchOptions = {
      method: fetchMethod,
      headers: {},
    };

    if (fetchMethod === "POST") {
      fetchOptions.headers["Content-Type"] = "application/json";
      fetchOptions.body = fetchBody;
    }

    console.log("Proxy.cjs envoie vers :", fullTargetUrl);
    console.log("Options fetch :", fetchOptions);

    const response = await fetch(fullTargetUrl, fetchOptions);

    const contentType = response.headers.get("content-type") || "";
    const isJSON = contentType.includes("application/json");
    const body = isJSON ? await response.json() : await response.text();

    console.log("Proxy.cjs reçoit :", body);

    return {
      statusCode: response.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": isJSON ? "application/json" : "text/plain",
      },
      body: isJSON ? JSON.stringify(body) : body,
    };

  } catch (error) {
    console.error("Erreur dans proxy.cjs :", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: `Erreur interne du proxy : ${error.message}` }),
    };
  }
};FO   Proxy.cjs reçoit : [
  {
    id: 'abc123',
    nom: 'Dupont',
    email: 'dupont@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '10 sec',
    date: '2025-06-06T22:00:00.000Z',
    description: 'Exemple demande 1',
    chaine: 'La Une',
    traite: false
  },
  {
    id: 'def456',
    nom: 'Martin',
    email: 'martin@rtbf.be',
    type: 'audio',
    support: 'TV',
    duree: '20 sec',
    date: '2025-06-07T22:00:00.000Z',
    description: 'Exemple demande 2',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: 'fdfds',
    nom: 'Steeve',
    email: 'spi@rtbf.be',
    type: 'audio',
    support: 'TV',
    duree: '12 sec',
    date: '2025-06-07T22:00:00.000Z',
    description: 'dhsjhdjhsjdhjshds',
    chaine: 'classic21',
    traite: false
  },
  {
    id: 'sqsq',
    nom: 'sqs',
    email: 'dsds',
    type: 'dsds',
    support: 'TV',
    duree: 'dsds',
    date: 'dsdsds',
    description: 'dsds',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_tcgo7qv3c',
    nom: 'pires madeira',
    email: 'spi@rtbf.be@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '19 sec',
    date: '2025-05-26T22:00:00.000Z',
    description: 'gf',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_zays1m6ze',
    nom: 'pires madeira',
    email: 'spi@rtbf.be@rtbf.be',
    type: 'vidéo',
    support: 'autre',
    duree: '6 sec',
    date: '2025-05-27T22:00:00.000Z',
    description: 'caca',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_ppimmplzo',
    nom: 'eliot',
    email: 'eli@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '18 sec',
    date: '2025-06-17T22:00:00.000Z',
    description: 'test de fin yeahhhhhhhhh',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_gj0fd9tl4',
    nom: 'pires madeira',
    email: 'spi@rtbf.be',
    type: 'audio',
    support: 'Radio',
    duree: '7 sec',
    date: '2025-07-01T22:00:00.000Z',
    description: 'sqsqsqhdjfdfdsnjhfjdhsfdsf',
    chaine: 'Classic 21',
    traite: false
  },
  {
    id: '_tg80x8j2k',
    nom: 'pires madeira',
    email: 'ds@rtbf.be',
    type: 'vidéo',
    support: 'Radio',
    duree: '19 sec',
    date: '2025-06-27T22:00:00.000Z',
    description: 'ds',
    chaine: 'La Trois',
    traite: false
  },
  {
    id: '_rwvxpsr66',
    nom: 'steeve',
    email: 'spi@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '16 sec',
    date: '2025-06-25T22:00:00.000Z',
    description: 'hdhsjhdjsqhdjoqsklgkjdfkgjfdklg',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_c65gbm0rb',
    nom: 'pires madeira',
    email: 'der@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '19 sec',
    date: '2025-06-27T22:00:00.000Z',
    description: 'df',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_ef85l2b9u',
    nom: 'genevieve',
    email: 'spi@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '12 sec',
    date: '2025-06-26T22:00:00.000Z',
    description: 'dsjhkdshdjsdsqdjkdjskqjldqs',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_ymbmiek7b',
    nom: 'Steeve Pires Madeira',
    email: 'spi@rtbf.be@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '8 sec',
    date: '2025-06-18T22:00:00.000Z',
    description: 'Briefing Créatif – Habillage IA RTBF\n' +
      'Contexte :\n' +
      'La RTBF souhaite un habillage vidéo innovant, généré partiellement par IA, destiné à un public plutôt âgé (50+), fidèle à la chaîne.\n' +
      '\n' +
      'Objectif :\n' +
      'Allier modernité et chaleur humaine. L’IA doit être un outil poétique, non technologique ou froid. Habillage rassurant, incarné, fluide.\n' +
      '\n' +
      'Direction artistique :\n' +
      '\n' +
      'Style visuel : textures organiques (papier, lumière, textile) mêlées à des formes abstraites générées par IA.\n' +
      '\n' +
      'Couleurs : palette naturelle, chaude (ocre, vert mousse, bleu nuit).\n' +
      '\n' +
      'Typo : sans-serif lisible, animée en douceur (fondu, vibration légère).\n' +
      '\n' +
      'Mouvement : transitions fluides, lentes, évoquant le souffle du temps.\n' +
      '\n' +
      'Narration visuelle :\n' +
      'Le fil conducteur est la mémoire et la transmission : visages flous, lettres en mouvement, éléments en transformation.\n' +
      '\n' +
      'Ton :\n' +
      'Apaisant, humain, poétique. Montrer que l’innovation peut respecter les valeurs de proximité et de confiance.\n' +
      '\n' +
      'Livrables :\n' +
      'Génériques, transitions, lower-thirds, vidéo manifeste (30s), déclinaisons réseaux. Format UHD, conforme à la charte RTBF.\n' +
      '\n' +
      'Contraintes :\n' +
      'IA éthique (pas de deepfake), lisibilité maximale, incarnation prioritaire.\n' +
      '\n',
    chaine: 'La Une',
    traite: false
  }
]
Jun 15, 12:43:00 AM: b4e30ee9 Duration: 2577.97 ms	Memory Usage: 90 MB
Jun 15, 12:43:12 AM: 46d81f61 INFO   Proxy.cjs envoie vers : https://script.google.com/macros/s/AKfycbyoDFofm25-QcQdli_bx4Odkl-xDw7501CbadTf3k85dWPx_gTq_oPVuHo7s3Mk7Q/exec?action=getDemandesIA
Jun 15, 12:43:12 AM: 46d81f61 INFO   Options fetch : { method: 'GET', headers: {} }
Jun 15, 12:43:15 AM: 46d81f61 INFO   Proxy.cjs reçoit : [
  {
    id: 'abc123',
    nom: 'Dupont',
    email: 'dupont@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '10 sec',
    date: '2025-06-06T22:00:00.000Z',
    description: 'Exemple demande 1',
    chaine: 'La Une',
    traite: false
  },
  {
    id: 'def456',
    nom: 'Martin',
    email: 'martin@rtbf.be',
    type: 'audio',
    support: 'TV',
    duree: '20 sec',
    date: '2025-06-07T22:00:00.000Z',
    description: 'Exemple demande 2',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: 'fdfds',
    nom: 'Steeve',
    email: 'spi@rtbf.be',
    type: 'audio',
    support: 'TV',
    duree: '12 sec',
    date: '2025-06-07T22:00:00.000Z',
    description: 'dhsjhdjhsjdhjshds',
    chaine: 'classic21',
    traite: false
  },
  {
    id: 'sqsq',
    nom: 'sqs',
    email: 'dsds',
    type: 'dsds',
    support: 'TV',
    duree: 'dsds',
    date: 'dsdsds',
    description: 'dsds',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_tcgo7qv3c',
    nom: 'pires madeira',
    email: 'spi@rtbf.be@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '19 sec',
    date: '2025-05-26T22:00:00.000Z',
    description: 'gf',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_zays1m6ze',
    nom: 'pires madeira',
    email: 'spi@rtbf.be@rtbf.be',
    type: 'vidéo',
    support: 'autre',
    duree: '6 sec',
    date: '2025-05-27T22:00:00.000Z',
    description: 'caca',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_ppimmplzo',
    nom: 'eliot',
    email: 'eli@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '18 sec',
    date: '2025-06-17T22:00:00.000Z',
    description: 'test de fin yeahhhhhhhhh',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_gj0fd9tl4',
    nom: 'pires madeira',
    email: 'spi@rtbf.be',
    type: 'audio',
    support: 'Radio',
    duree: '7 sec',
    date: '2025-07-01T22:00:00.000Z',
    description: 'sqsqsqhdjfdfdsnjhfjdhsfdsf',
    chaine: 'Classic 21',
    traite: false
  },
  {
    id: '_tg80x8j2k',
    nom: 'pires madeira',
    email: 'ds@rtbf.be',
    type: 'vidéo',
    support: 'Radio',
    duree: '19 sec',
    date: '2025-06-27T22:00:00.000Z',
    description: 'ds',
    chaine: 'La Trois',
    traite: false
  },
  {
    id: '_rwvxpsr66',
    nom: 'steeve',
    email: 'spi@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '16 sec',
    date: '2025-06-25T22:00:00.000Z',
    description: 'hdhsjhdjsqhdjoqsklgkjdfkgjfdklg',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_c65gbm0rb',
    nom: 'pires madeira',
    email: 'der@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '19 sec',
    date: '2025-06-27T22:00:00.000Z',
    description: 'df',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_ef85l2b9u',
    nom: 'genevieve',
    email: 'spi@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '12 sec',
    date: '2025-06-26T22:00:00.000Z',
    description: 'dsjhkdshdjsdsqdjkdjskqjldqs',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_ymbmiek7b',
    nom: 'Steeve Pires Madeira',
    email: 'spi@rtbf.be@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '8 sec',
    date: '2025-06-18T22:00:00.000Z',
    description: 'Briefing Créatif – Habillage IA RTBF\n' +
      'Contexte :\n' +
      'La RTBF souhaite un habillage vidéo innovant, généré partiellement par IA, destiné à un public plutôt âgé (50+), fidèle à la chaîne.\n' +
      '\n' +
      'Objectif :\n' +
      'Allier modernité et chaleur humaine. L’IA doit être un outil poétique, non technologique ou froid. Habillage rassurant, incarné, fluide.\n' +
      '\n' +
      'Direction artistique :\n' +
      '\n' +
      'Style visuel : textures organiques (papier, lumière, textile) mêlées à des formes abstraites générées par IA.\n' +
      '\n' +
      'Couleurs : palette naturelle, chaude (ocre, vert mousse, bleu nuit).\n' +
      '\n' +
      'Typo : sans-serif lisible, animée en douceur (fondu, vibration légère).\n' +
      '\n' +
      'Mouvement : transitions fluides, lentes, évoquant le souffle du temps.\n' +
      '\n' +
      'Narration visuelle :\n' +
      'Le fil conducteur est la mémoire et la transmission : visages flous, lettres en mouvement, éléments en transformation.\n' +
      '\n' +
      'Ton :\n' +
      'Apaisant, humain, poétique. Montrer que l’innovation peut respecter les valeurs de proximité et de confiance.\n' +
      '\n' +
      'Livrables :\n' +
      'Génériques, transitions, lower-thirds, vidéo manifeste (30s), déclinaisons réseaux. Format UHD, conforme à la charte RTBF.\n' +
      '\n' +
      'Contraintes :\n' +
      'IA éthique (pas de deepfake), lisibilité maximale, incarnation prioritaire.\n' +
      '\n',
    chaine: 'La Une',
    traite: false
  }
]
Jun 15, 12:43:15 AM: 46d81f61 Duration: 2960.62 ms	Memory Usage: 95 MB
Jun 15, 12:43:15 AM: 26eb296b INFO   Proxy.cjs envoie vers : https://script.google.com/macros/s/AKfycbyoDFofm25-QcQdli_bx4Odkl-xDw7501CbadTf3k85dWPx_gTq_oPVuHo7s3Mk7Q/exec?action=getDemandesIA
Jun 15, 12:43:15 AM: 26eb296b INFO   Options fetch : { method: 'GET', headers: {} }
Jun 15, 12:43:17 AM: 26eb296b INFO   Proxy.cjs reçoit : [
  {
    id: 'abc123',
    nom: 'Dupont',
    email: 'dupont@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '10 sec',
    date: '2025-06-06T22:00:00.000Z',
    description: 'Exemple demande 1',
    chaine: 'La Une',
    traite: false
  },
  {
    id: 'def456',
    nom: 'Martin',
    email: 'martin@rtbf.be',
    type: 'audio',
    support: 'TV',
    duree: '20 sec',
    date: '2025-06-07T22:00:00.000Z',
    description: 'Exemple demande 2',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: 'fdfds',
    nom: 'Steeve',
    email: 'spi@rtbf.be',
    type: 'audio',
    support: 'TV',
    duree: '12 sec',
    date: '2025-06-07T22:00:00.000Z',
    description: 'dhsjhdjhsjdhjshds',
    chaine: 'classic21',
    traite: false
  },
  {
    id: 'sqsq',
    nom: 'sqs',
    email: 'dsds',
    type: 'dsds',
    support: 'TV',
    duree: 'dsds',
    date: 'dsdsds',
    description: 'dsds',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_tcgo7qv3c',
    nom: 'pires madeira',
    email: 'spi@rtbf.be@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '19 sec',
    date: '2025-05-26T22:00:00.000Z',
    description: 'gf',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_zays1m6ze',
    nom: 'pires madeira',
    email: 'spi@rtbf.be@rtbf.be',
    type: 'vidéo',
    support: 'autre',
    duree: '6 sec',
    date: '2025-05-27T22:00:00.000Z',
    description: 'caca',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_ppimmplzo',
    nom: 'eliot',
    email: 'eli@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '18 sec',
    date: '2025-06-17T22:00:00.000Z',
    description: 'test de fin yeahhhhhhhhh',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_gj0fd9tl4',
    nom: 'pires madeira',
    email: 'spi@rtbf.be',
    type: 'audio',
    support: 'Radio',
    duree: '7 sec',
    date: '2025-07-01T22:00:00.000Z',
    description: 'sqsqsqhdjfdfdsnjhfjdhsfdsf',
    chaine: 'Classic 21',
    traite: false
  },
  {
    id: '_tg80x8j2k',
    nom: 'pires madeira',
    email: 'ds@rtbf.be',
    type: 'vidéo',
    support: 'Radio',
    duree: '19 sec',
    date: '2025-06-27T22:00:00.000Z',
    description: 'ds',
    chaine: 'La Trois',
    traite: false
  },
  {
    id: '_rwvxpsr66',
    nom: 'steeve',
    email: 'spi@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '16 sec',
    date: '2025-06-25T22:00:00.000Z',
    description: 'hdhsjhdjsqhdjoqsklgkjdfkgjfdklg',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_c65gbm0rb',
    nom: 'pires madeira',
    email: 'der@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '19 sec',
    date: '2025-06-27T22:00:00.000Z',
    description: 'df',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_ef85l2b9u',
    nom: 'genevieve',
    email: 'spi@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '12 sec',
    date: '2025-06-26T22:00:00.000Z',
    description: 'dsjhkdshdjsdsqdjkdjskqjldqs',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_ymbmiek7b',
    nom: 'Steeve Pires Madeira',
    email: 'spi@rtbf.be@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '8 sec',
    date: '2025-06-18T22:00:00.000Z',
    description: 'Briefing Créatif – Habillage IA RTBF\n' +
      'Contexte :\n' +
      'La RTBF souhaite un habillage vidéo innovant, généré partiellement par IA, destiné à un public plutôt âgé (50+), fidèle à la chaîne.\n' +
      '\n' +
      'Objectif :\n' +
      'Allier modernité et chaleur humaine. L’IA doit être un outil poétique, non technologique ou froid. Habillage rassurant, incarné, fluide.\n' +
      '\n' +
      'Direction artistique :\n' +
      '\n' +
      'Style visuel : textures organiques (papier, lumière, textile) mêlées à des formes abstraites générées par IA.\n' +
      '\n' +
      'Couleurs : palette naturelle, chaude (ocre, vert mousse, bleu nuit).\n' +
      '\n' +
      'Typo : sans-serif lisible, animée en douceur (fondu, vibration légère).\n' +
      '\n' +
      'Mouvement : transitions fluides, lentes, évoquant le souffle du temps.\n' +
      '\n' +
      'Narration visuelle :\n' +
      'Le fil conducteur est la mémoire et la transmission : visages flous, lettres en mouvement, éléments en transformation.\n' +
      '\n' +
      'Ton :\n' +
      'Apaisant, humain, poétique. Montrer que l’innovation peut respecter les valeurs de proximité et de confiance.\n' +
      '\n' +
      'Livrables :\n' +
      'Génériques, transitions, lower-thirds, vidéo manifeste (30s), déclinaisons réseaux. Format UHD, conforme à la charte RTBF.\n' +
      '\n' +
      'Contraintes :\n' +
      'IA éthique (pas de deepfake), lisibilité maximale, incarnation prioritaire.\n' +
      '\n',
    chaine: 'La Une',
    traite: false
  }
]
Jun 15, 12:43:17 AM: 26eb296b Duration: 2149.63 ms	Memory Usage: 95 MB
Jun 15, 12:43:19 AM: 77b7a9e6 INFO   Proxy.cjs envoie vers : https://script.google.com/macros/s/AKfycbyoDFofm25-QcQdli_bx4Odkl-xDw7501CbadTf3k85dWPx_gTq_oPVuHo7s3Mk7Q/exec?action=getDemandesIA
Jun 15, 12:43:19 AM: 77b7a9e6 INFO   Options fetch : { method: 'GET', headers: {} }
Jun 15, 12:43:21 AM: 77b7a9e6 INFO   Proxy.cjs reçoit : [
  {
    id: 'abc123',
    nom: 'Dupont',
    email: 'dupont@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '10 sec',
    date: '2025-06-06T22:00:00.000Z',
    description: 'Exemple demande 1',
    chaine: 'La Une',
    traite: false
  },
  {
    id: 'def456',
    nom: 'Martin',
    email: 'martin@rtbf.be',
    type: 'audio',
    support: 'TV',
    duree: '20 sec',
    date: '2025-06-07T22:00:00.000Z',
    description: 'Exemple demande 2',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: 'fdfds',
    nom: 'Steeve',
    email: 'spi@rtbf.be',
    type: 'audio',
    support: 'TV',
    duree: '12 sec',
    date: '2025-06-07T22:00:00.000Z',
    description: 'dhsjhdjhsjdhjshds',
    chaine: 'classic21',
    traite: false
  },
  {
    id: 'sqsq',
    nom: 'sqs',
    email: 'dsds',
    type: 'dsds',
    support: 'TV',
    duree: 'dsds',
    date: 'dsdsds',
    description: 'dsds',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_tcgo7qv3c',
    nom: 'pires madeira',
    email: 'spi@rtbf.be@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '19 sec',
    date: '2025-05-26T22:00:00.000Z',
    description: 'gf',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_zays1m6ze',
    nom: 'pires madeira',
    email: 'spi@rtbf.be@rtbf.be',
    type: 'vidéo',
    support: 'autre',
    duree: '6 sec',
    date: '2025-05-27T22:00:00.000Z',
    description: 'caca',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_ppimmplzo',
    nom: 'eliot',
    email: 'eli@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '18 sec',
    date: '2025-06-17T22:00:00.000Z',
    description: 'test de fin yeahhhhhhhhh',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_gj0fd9tl4',
    nom: 'pires madeira',
    email: 'spi@rtbf.be',
    type: 'audio',
    support: 'Radio',
    duree: '7 sec',
    date: '2025-07-01T22:00:00.000Z',
    description: 'sqsqsqhdjfdfdsnjhfjdhsfdsf',
    chaine: 'Classic 21',
    traite: false
  },
  {
    id: '_tg80x8j2k',
    nom: 'pires madeira',
    email: 'ds@rtbf.be',
    type: 'vidéo',
    support: 'Radio',
    duree: '19 sec',
    date: '2025-06-27T22:00:00.000Z',
    description: 'ds',
    chaine: 'La Trois',
    traite: false
  },
  {
    id: '_rwvxpsr66',
    nom: 'steeve',
    email: 'spi@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '16 sec',
    date: '2025-06-25T22:00:00.000Z',
    description: 'hdhsjhdjsqhdjoqsklgkjdfkgjfdklg',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_c65gbm0rb',
    nom: 'pires madeira',
    email: 'der@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '19 sec',
    date: '2025-06-27T22:00:00.000Z',
    description: 'df',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_ef85l2b9u',
    nom: 'genevieve',
    email: 'spi@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '12 sec',
    date: '2025-06-26T22:00:00.000Z',
    description: 'dsjhkdshdjsdsqdjkdjskqjldqs',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_ymbmiek7b',
    nom: 'Steeve Pires Madeira',
    email: 'spi@rtbf.be@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '8 sec',
    date: '2025-06-18T22:00:00.000Z',
    description: 'Briefing Créatif – Habillage IA RTBF\n' +
      'Contexte :\n' +
      'La RTBF souhaite un habillage vidéo innovant, généré partiellement par IA, destiné à un public plutôt âgé (50+), fidèle à la chaîne.\n' +
      '\n' +
      'Objectif :\n' +
      'Allier modernité et chaleur humaine. L’IA doit être un outil poétique, non technologique ou froid. Habillage rassurant, incarné, fluide.\n' +
      '\n' +
      'Direction artistique :\n' +
      '\n' +
      'Style visuel : textures organiques (papier, lumière, textile) mêlées à des formes abstraites générées par IA.\n' +
      '\n' +
      'Couleurs : palette naturelle, chaude (ocre, vert mousse, bleu nuit).\n' +
      '\n' +
      'Typo : sans-serif lisible, animée en douceur (fondu, vibration légère).\n' +
      '\n' +
      'Mouvement : transitions fluides, lentes, évoquant le souffle du temps.\n' +
      '\n' +
      'Narration visuelle :\n' +
      'Le fil conducteur est la mémoire et la transmission : visages flous, lettres en mouvement, éléments en transformation.\n' +
      '\n' +
      'Ton :\n' +
      'Apaisant, humain, poétique. Montrer que l’innovation peut respecter les valeurs de proximité et de confiance.\n' +
      '\n' +
      'Livrables :\n' +
      'Génériques, transitions, lower-thirds, vidéo manifeste (30s), déclinaisons réseaux. Format UHD, conforme à la charte RTBF.\n' +
      '\n' +
      'Contraintes :\n' +
      'IA éthique (pas de deepfake), lisibilité maximale, incarnation prioritaire.\n' +
      '\n',
    chaine: 'La Une',
    traite: false
  }
]
Jun 15, 12:43:21 AM: 77b7a9e6 Duration: 2253.49 ms	Memory Usage: 97 MB
Jun 15, 12:43:22 AM: 10aa9cf6 INFO   Proxy.cjs envoie vers : https://script.google.com/macros/s/AKfycbyoDFofm25-QcQdli_bx4Odkl-xDw7501CbadTf3k85dWPx_gTq_oPVuHo7s3Mk7Q/exec?action=updateDemandeIA
Jun 15, 12:43:22 AM: 10aa9cf6 INFO   Options fetch : {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{"action":"updateDemandeIA","demandes":[{"id":"def456","nom":"Martin","email":"martin@rtbf.be","type":"audio","support":"TV","duree":"20 sec","date":"2025-06-07T22:00:00.000Z","description":"Exemple demande 2","chaine":"Tipik","traite":false},{"id":"fdfds","nom":"Steeve","email":"spi@rtbf.be","type":"audio","support":"TV","duree":"12 sec","date":"2025-06-07T22:00:00.000Z","description":"dhsjhdjhsjdhjshds","chaine":"classic21","traite":false},{"id":"sqsq","nom":"sqs","email":"dsds","type":"dsds","support":"TV","duree":"dsds","date":"dsdsds","description":"dsds","chaine":"Tipik","traite":false},{"id":"_tcgo7qv3c","nom":"pires madeira","email":"spi@rtbf.be@rtbf.be","type":"vidéo","support":"TV","duree":"19 sec","date":"2025-05-26T22:00:00.000Z","description":"gf","chaine":"Tipik","traite":false},{"id":"_zays1m6ze","nom":"pires madeira","email":"spi@rtbf.be@rtbf.be","type":"vidéo","support":"autre","duree":"6 sec","date":"2025-05-27T22:00:00.000Z","description":"caca","chaine":"Tipik","traite":false},{"id":"_ppimmplzo","nom":"eliot","email":"eli@rtbf.be","type":"vidéo","support":"TV","duree":"18 sec","date":"2025-06-17T22:00:00.000Z","description":"test de fin yeahhhhhhhhh","chaine":"Tipik","traite":false},{"id":"_gj0fd9tl4","nom":"pires madeira","email":"spi@rtbf.be","type":"audio","support":"Radio","duree":"7 sec","date":"2025-07-01T22:00:00.000Z","description":"sqsqsqhdjfdfdsnjhfjdhsfdsf","chaine":"Classic 21","traite":false},{"id":"_tg80x8j2k","nom":"pires madeira","email":"ds@rtbf.be","type":"vidéo","support":"Radio","duree":"19 sec","date":"2025-06-27T22:00:00.000Z","description":"ds","chaine":"La Trois","traite":false},{"id":"_rwvxpsr66","nom":"steeve","email":"spi@rtbf.be","type":"vidéo","support":"TV","duree":"16 sec","date":"2025-06-25T22:00:00.000Z","description":"hdhsjhdjsqhdjoqsklgkjdfkgjfdklg","chaine":"Tipik","traite":false},{"id":"_c65gbm0rb","nom":"pires madeira","email":"der@rtbf.be","type":"vidéo","support":"TV","duree":"19 sec","date":"2025-06-27T22:00:00.000Z","description":"df","chaine":"Tipik","traite":false},{"id":"_ef85l2b9u","nom":"genevieve","email":"spi@rtbf.be","type":"vidéo","support":"TV","duree":"12 sec","date":"2025-06-26T22:00:00.000Z","description":"dsjhkdshdjsdsqdjkdjskqjldqs","chaine":"Tipik","traite":false},{"id":"_ymbmiek7b","nom":"Steeve Pires Madeira","email":"spi@rtbf.be@rtbf.be","type":"vidéo","support":"TV","duree":"8 sec","date":"2025-06-18T22:00:00.000Z","description":"Briefing Créatif – Habillage IA RTBF\\nContexte :\\nLa RTBF souhaite un habillage vidéo innovant, généré partiellement par IA, destiné à un public plutôt âgé (50+), fidèle à la chaîne.\\n\\nObjectif :\\nAllier modernité et chaleur humaine. L’IA doit être un outil poétique, non technologique ou froid. Habillage rassurant, incarné, fluide.\\n\\nDirection artistique :\\n\\nStyle visuel : textures organiques (papier, lumière, textile) mêlées à des formes abstraites générées par IA.\\n\\nCouleurs : palette naturelle, chaude (ocre, vert mousse, bleu nuit).\\n\\nTypo : sans-serif lisible, animée en douceur (fondu, vibration légère).\\n\\nMouvement : transitions fluides, lentes, évoquant le souffle du temps.\\n\\nNarration visuelle :\\nLe fil conducteur est la mémoire et la transmission : visages flous, lettres en mouvement, éléments en transformation.\\n\\nTon :\\nApaisant, humain, poétique. Montrer que l’innovation peut respecter les valeurs de proximité et de confiance.\\n\\nLivrables :\\nGénériques, transitions, lower-thirds, vidéo manifeste (30s), déclinaisons réseaux. Format UHD, conforme à la charte RTBF.\\n\\nContraintes :\\nIA éthique (pas de deepfake), lisibilité maximale, incarnation prioritaire.\\n\\n","chaine":"La Une","traite":false}]}'
}
Jun 15, 12:43:23 AM: 10aa9cf6 INFO   Proxy.cjs reçoit : <!DOCTYPE html><html><head><link rel="shortcut icon" href="//ssl.gstatic.com/docs/script/images/favicon.ico"><title>Error</title><style type="text/css" nonce="NKAne3FehkMukgoNBpVpcQ">body {background-color: #fff; margin: 0; padding: 0;}.errorMessage {font-family: Arial,sans-serif; font-size: 12pt; font-weight: bold; line-height: 150%; padding-top: 25px;}</style></head><body style="margin:20px"><div><img alt="Google Apps Script" src="//ssl.gstatic.com/docs/script/images/logo.png"></div><div style="text-align:center;font-family:monospace;margin:50px auto 0;max-width:600px">Script function not found: doPost</div></body></html>
Jun 15, 12:43:23 AM: 10aa9cf6 Duration: 1092.94 ms	Memory Usage: 97 MB
Jun 15, 12:43:23 AM: bad0801f INFO   Proxy.cjs envoie vers : https://script.google.com/macros/s/AKfycbyoDFofm25-QcQdli_bx4Odkl-xDw7501CbadTf3k85dWPx_gTq_oPVuHo7s3Mk7Q/exec?action=getDemandesIA
Jun 15, 12:43:23 AM: bad0801f INFO   Options fetch : { method: 'GET', headers: {} }
Jun 15, 12:43:25 AM: bad0801f INFO   Proxy.cjs reçoit : [
  {
    id: 'abc123',
    nom: 'Dupont',
    email: 'dupont@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '10 sec',
    date: '2025-06-06T22:00:00.000Z',
    description: 'Exemple demande 1',
    chaine: 'La Une',
    traite: false
  },
  {
    id: 'def456',
    nom: 'Martin',
    email: 'martin@rtbf.be',
    type: 'audio',
    support: 'TV',
    duree: '20 sec',
    date: '2025-06-07T22:00:00.000Z',
    description: 'Exemple demande 2',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: 'fdfds',
    nom: 'Steeve',
    email: 'spi@rtbf.be',
    type: 'audio',
    support: 'TV',
    duree: '12 sec',
    date: '2025-06-07T22:00:00.000Z',
    description: 'dhsjhdjhsjdhjshds',
    chaine: 'classic21',
    traite: false
  },
  {
    id: 'sqsq',
    nom: 'sqs',
    email: 'dsds',
    type: 'dsds',
    support: 'TV',
    duree: 'dsds',
    date: 'dsdsds',
    description: 'dsds',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_tcgo7qv3c',
    nom: 'pires madeira',
    email: 'spi@rtbf.be@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '19 sec',
    date: '2025-05-26T22:00:00.000Z',
    description: 'gf',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_zays1m6ze',
    nom: 'pires madeira',
    email: 'spi@rtbf.be@rtbf.be',
    type: 'vidéo',
    support: 'autre',
    duree: '6 sec',
    date: '2025-05-27T22:00:00.000Z',
    description: 'caca',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_ppimmplzo',
    nom: 'eliot',
    email: 'eli@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '18 sec',
    date: '2025-06-17T22:00:00.000Z',
    description: 'test de fin yeahhhhhhhhh',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_gj0fd9tl4',
    nom: 'pires madeira',
    email: 'spi@rtbf.be',
    type: 'audio',
    support: 'Radio',
    duree: '7 sec',
    date: '2025-07-01T22:00:00.000Z',
    description: 'sqsqsqhdjfdfdsnjhfjdhsfdsf',
    chaine: 'Classic 21',
    traite: false
  },
  {
    id: '_tg80x8j2k',
    nom: 'pires madeira',
    email: 'ds@rtbf.be',
    type: 'vidéo',
    support: 'Radio',
    duree: '19 sec',
    date: '2025-06-27T22:00:00.000Z',
    description: 'ds',
    chaine: 'La Trois',
    traite: false
  },
  {
    id: '_rwvxpsr66',
    nom: 'steeve',
    email: 'spi@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '16 sec',
    date: '2025-06-25T22:00:00.000Z',
    description: 'hdhsjhdjsqhdjoqsklgkjdfkgjfdklg',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_c65gbm0rb',
    nom: 'pires madeira',
    email: 'der@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '19 sec',
    date: '2025-06-27T22:00:00.000Z',
    description: 'df',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_ef85l2b9u',
    nom: 'genevieve',
    email: 'spi@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '12 sec',
    date: '2025-06-26T22:00:00.000Z',
    description: 'dsjhkdshdjsdsqdjkdjskqjldqs',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_ymbmiek7b',
    nom: 'Steeve Pires Madeira',
    email: 'spi@rtbf.be@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '8 sec',
    date: '2025-06-18T22:00:00.000Z',
    description: 'Briefing Créatif – Habillage IA RTBF\n' +
      'Contexte :\n' +
      'La RTBF souhaite un habillage vidéo innovant, généré partiellement par IA, destiné à un public plutôt âgé (50+), fidèle à la chaîne.\n' +
      '\n' +
      'Objectif :\n' +
      'Allier modernité et chaleur humaine. L’IA doit être un outil poétique, non technologique ou froid. Habillage rassurant, incarné, fluide.\n' +
      '\n' +
      'Direction artistique :\n' +
      '\n' +
      'Style visuel : textures organiques (papier, lumière, textile) mêlées à des formes abstraites générées par IA.\n' +
      '\n' +
      'Couleurs : palette naturelle, chaude (ocre, vert mousse, bleu nuit).\n' +
      '\n' +
      'Typo : sans-serif lisible, animée en douceur (fondu, vibration légère).\n' +
      '\n' +
      'Mouvement : transitions fluides, lentes, évoquant le souffle du temps.\n' +
      '\n' +
      'Narration visuelle :\n' +
      'Le fil conducteur est la mémoire et la transmission : visages flous, lettres en mouvement, éléments en transformation.\n' +
      '\n' +
      'Ton :\n' +
      'Apaisant, humain, poétique. Montrer que l’innovation peut respecter les valeurs de proximité et de confiance.\n' +
      '\n' +
      'Livrables :\n' +
      'Génériques, transitions, lower-thirds, vidéo manifeste (30s), déclinaisons réseaux. Format UHD, conforme à la charte RTBF.\n' +
      '\n' +
      'Contraintes :\n' +
      'IA éthique (pas de deepfake), lisibilité maximale, incarnation prioritaire.\n' +
      '\n',
    chaine: 'La Une',
    traite: false
  }
]
Jun 15, 12:43:25 AM: bad0801f Duration: 2133.75 ms	Memory Usage: 97 MB
Jun 15, 12:43:25 AM: d18f0593 INFO   Proxy.cjs envoie vers : https://script.google.com/macros/s/AKfycbyoDFofm25-QcQdli_bx4Odkl-xDw7501CbadTf3k85dWPx_gTq_oPVuHo7s3Mk7Q/exec?action=getDemandesIA
Jun 15, 12:43:25 AM: d18f0593 INFO   Options fetch : { method: 'GET', headers: {} }
Jun 15, 12:43:27 AM: d18f0593 INFO   Proxy.cjs reçoit : [
  {
    id: 'abc123',
    nom: 'Dupont',
    email: 'dupont@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '10 sec',
    date: '2025-06-06T22:00:00.000Z',
    description: 'Exemple demande 1',
    chaine: 'La Une',
    traite: false
  },
  {
    id: 'def456',
    nom: 'Martin',
    email: 'martin@rtbf.be',
    type: 'audio',
    support: 'TV',
    duree: '20 sec',
    date: '2025-06-07T22:00:00.000Z',
    description: 'Exemple demande 2',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: 'fdfds',
    nom: 'Steeve',
    email: 'spi@rtbf.be',
    type: 'audio',
    support: 'TV',
    duree: '12 sec',
    date: '2025-06-07T22:00:00.000Z',
    description: 'dhsjhdjhsjdhjshds',
    chaine: 'classic21',
    traite: false
  },
  {
    id: 'sqsq',
    nom: 'sqs',
    email: 'dsds',
    type: 'dsds',
    support: 'TV',
    duree: 'dsds',
    date: 'dsdsds',
    description: 'dsds',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_tcgo7qv3c',
    nom: 'pires madeira',
    email: 'spi@rtbf.be@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '19 sec',
    date: '2025-05-26T22:00:00.000Z',
    description: 'gf',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_zays1m6ze',
    nom: 'pires madeira',
    email: 'spi@rtbf.be@rtbf.be',
    type: 'vidéo',
    support: 'autre',
    duree: '6 sec',
    date: '2025-05-27T22:00:00.000Z',
    description: 'caca',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_ppimmplzo',
    nom: 'eliot',
    email: 'eli@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '18 sec',
    date: '2025-06-17T22:00:00.000Z',
    description: 'test de fin yeahhhhhhhhh',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_gj0fd9tl4',
    nom: 'pires madeira',
    email: 'spi@rtbf.be',
    type: 'audio',
    support: 'Radio',
    duree: '7 sec',
    date: '2025-07-01T22:00:00.000Z',
    description: 'sqsqsqhdjfdfdsnjhfjdhsfdsf',
    chaine: 'Classic 21',
    traite: false
  },
  {
    id: '_tg80x8j2k',
    nom: 'pires madeira',
    email: 'ds@rtbf.be',
    type: 'vidéo',
    support: 'Radio',
    duree: '19 sec',
    date: '2025-06-27T22:00:00.000Z',
    description: 'ds',
    chaine: 'La Trois',
    traite: false
  },
  {
    id: '_rwvxpsr66',
    nom: 'steeve',
    email: 'spi@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '16 sec',
    date: '2025-06-25T22:00:00.000Z',
    description: 'hdhsjhdjsqhdjoqsklgkjdfkgjfdklg',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_c65gbm0rb',
    nom: 'pires madeira',
    email: 'der@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '19 sec',
    date: '2025-06-27T22:00:00.000Z',
    description: 'df',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_ef85l2b9u',
    nom: 'genevieve',
    email: 'spi@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '12 sec',
    date: '2025-06-26T22:00:00.000Z',
    description: 'dsjhkdshdjsdsqdjkdjskqjldqs',
    chaine: 'Tipik',
    traite: false
  },
  {
    id: '_ymbmiek7b',
    nom: 'Steeve Pires Madeira',
    email: 'spi@rtbf.be@rtbf.be',
    type: 'vidéo',
    support: 'TV',
    duree: '8 sec',
    date: '2025-06-18T22:00:00.000Z',
    description: 'Briefing Créatif – Habillage IA RTBF\n' +
      'Contexte :\n' +
      'La RTBF souhaite un habillage vidéo innovant, généré partiellement par IA, destiné à un public plutôt âgé (50+), fidèle à la chaîne.\n' +
      '\n' +
      'Objectif :\n' +
      'Allier modernité et chaleur humaine. L’IA doit être un outil poétique, non technologique ou froid. Habillage rassurant, incarné, fluide.\n' +
      '\n' +
      'Direction artistique :\n' +
      '\n' +
      'Style visuel : textures organiques (papier, lumière, textile) mêlées à des formes abstraites générées par IA.\n' +
      '\n' +
      'Couleurs : palette naturelle, chaude (ocre, vert mousse, bleu nuit).\n' +
      '\n' +
      'Typo : sans-serif lisible, animée en douceur (fondu, vibration légère).\n' +
      '\n' +
      'Mouvement : transitions fluides, lentes, évoquant le souffle du temps.\n' +
      '\n' +
      'Narration visuelle :\n' +
      'Le fil conducteur est la mémoire et la transmission : visages flous, lettres en mouvement, éléments en transformation.\n' +
      '\n' +
      'Ton :\n' +
      'Apaisant, humain, poétique. Montrer que l’innovation peut respecter les valeurs de proximité et de confiance.\n' +
      '\n' +
      'Livrables :\n' +
      'Génériques, transitions, lower-thirds, vidéo manifeste (30s), déclinaisons réseaux. Format UHD, conforme à la charte RTBF.\n' +
      '\n' +
      'Contraintes :\n' +
      'IA éthique (pas de deepfake), lisibilité maximale, incarnation prioritaire.\n' +
      '\n',
    chaine: 'La Une',
    traite: false
  }
]
Jun 15, 12:43:27 AM: d18f0593 Duration: 1760.46 ms	Memory Usage: 97 MB
