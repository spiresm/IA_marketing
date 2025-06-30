// netlify/functions/convertToGif.js

const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Utilisez ce package pour inclure automatiquement l'exécutable FFmpeg lors du déploiement
const ffmpegStatic = require('@ffmpeg-installer/ffmpeg');
const ffmpegPath = ffmpegStatic.path; // Chemin vers l'exécutable FFmpeg

const execFilePromise = promisify(execFile);

exports.handler = async (event, context) => {
    // Vérifie que la requête est bien une requête POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // Parse les données envoyées depuis le frontend
        const { video, duration, start, fps } = JSON.parse(event.body);

        if (!video) {
            return { statusCode: 400, body: 'Missing video data' };
        }

        // Extrait les données Base64 de la chaîne (enlève le préfixe comme "data:video/mp4;base64,")
        const base64Data = video.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');

        // Crée un chemin de fichier temporaire pour la vidéo entrante
        // Netlify Functions offre un répertoire temporaire accessible via os.tmpdir()
        const inputFilePath = path.join(os.tmpdir(), `input_video_${Date.now()}.mp4`);
        await fs.promises.writeFile(inputFilePath, buffer); // Écrit le buffer dans le fichier

        // Crée un chemin de fichier temporaire pour le GIF de sortie
        const outputFilePath = path.join(os.tmpdir(), `output_gif_${Date.now()}.gif`);

        // Arguments FFmpeg pour la conversion vidéo en GIF
        // -i <input> : Fichier d'entrée
        // -ss <start_time> : Point de départ de la conversion (en secondes)
        // -t <duration> : Durée du segment à convertir (en secondes)
        // -vf "fps=<fps>,scale=320:-1:flags=lanczos" : Filtres vidéo
        //     fps : Définir le nombre de frames par seconde pour le GIF.
        //     scale=320:-1 : Redimensionne la largeur à 320 pixels, la hauteur est calculée automatiquement (-1)
        //                    pour maintenir le ratio. Vous pouvez ajuster cette résolution.
        //     flags=lanczos : Algorithme de mise à l'échelle de haute qualité.
        // -loop 0 : Fait en sorte que le GIF tourne en boucle indéfiniment.
        // -f gif : Force le format de sortie à GIF.
        const ffmpegArgs = [
            '-i', inputFilePath,
            '-ss', start.toString(),
            '-t', duration.toString(),
            '-vf', `fps=${fps},scale=320:-1:flags=lanczos`,
            '-loop', '0',
            '-f', 'gif',
            outputFilePath
        ];

        console.log(`Exécution de FFmpeg avec les arguments : ${ffmpegArgs.join(' ')}`);
        
        try {
            // Exécute la commande FFmpeg
            const { stdout, stderr } = await execFilePromise(ffmpegPath, ffmpegArgs);
            console.log('FFmpeg stdout:', stdout);
            if (stderr) {
                // FFmpeg écrit souvent des informations de progression sur stderr, ce n'est pas toujours une erreur
                console.warn('FFmpeg stderr (peut contenir des infos de progression) :', stderr);
            }
        } catch (execError) {
            console.error('Erreur d\'exécution de FFmpeg:', execError.message, execError.stderr);
            // Si FFmpeg échoue, assurez-vous de nettoyer les fichiers temporaires
            await fs.promises.unlink(inputFilePath).catch(e => console.error("Échec de suppression du fichier d'entrée:", e));
            await fs.promises.unlink(outputFilePath).catch(e => console.error("Échec de suppression du fichier de sortie:", e));
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Échec du traitement vidéo avec FFmpeg', error: execError.stderr || execError.message })
            };
        }

        // Lit le contenu du GIF converti
        const outputBuffer = await fs.promises.readFile(outputFilePath);

        // Supprime les fichiers temporaires après traitement
        await fs.promises.unlink(inputFilePath);
        await fs.promises.unlink(outputFilePath);

        // Retourne le GIF encodé en Base64 au frontend
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'image/gif',
                'Access-Control-Allow-Origin': '*' // Important pour les requêtes CORS
            },
            body: outputBuffer.toString('base64'),
            isBase64Encoded: true,
        };

    } catch (error) {
        console.error('Erreur dans la fonction Netlify convertToGif:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Erreur interne du serveur', error: error.message }),
        };
    }
};
